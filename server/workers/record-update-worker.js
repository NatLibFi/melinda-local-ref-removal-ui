/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* UI for removing references to local libraries from Melinda
*
* Copyright (C) 2016-2019 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-poistot
*
* melinda-poistot program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-poistot is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import amqp from 'amqplib';
import {readEnvironmentVariable, createTimer, exceptCoreErrors} from 'server/utils';
import {recordIsUnused, markRecordAsDeleted, isComponentRecord} from 'server/record-utils';
import {logger} from 'server/logger';
import {createApiClient} from '@natlibfi/melinda-rest-api-client';
import {readSessionToken} from 'server/session-crypt';
import {resolveMelindaId} from '../record-id-resolution-service';
import _ from 'lodash';
import {transformRecord} from 'server/record-transform-service';
import {checkAlephHealth} from '../aleph-health-check-service';

const restApiUrl = readEnvironmentVariable('REST_API_URL', null);
const minTaskIntervalSeconds = readEnvironmentVariable('MIN_TASK_INTERVAL_SECONDS', 10);
const SLOW_PROCESSING_WAIT_TIME_MS = 10000;
const ALEPH_UNAVAILABLE_WAIT_TIME = 10000;

const defaultConfig = {
  restApiUrl,
  restApiUsername: '',
  restApiPassword: '',
};

const AMQP_HOST = readEnvironmentVariable('AMQP_HOST');
const AMQP_USERNAME = readEnvironmentVariable('AMQP_USERNAME', 'guest', {hideDefaultValue: true});
const AMQP_PASSWORD = readEnvironmentVariable('AMQP_PASSWORD', 'guest', {hideDefaultValue: true});
const INCOMING_TASK_QUEUE = 'task_queue';
const OUTGOING_TASK_QUEUE = 'task_result_queue';

export function connect() {
  return amqp.connect(`amqp://${AMQP_USERNAME}:${AMQP_PASSWORD}@${AMQP_HOST}`)
    .then(conn => conn.createChannel())
    .then(ch => {
      ch.assertQueue(INCOMING_TASK_QUEUE, {durable: true});
      ch.assertQueue(OUTGOING_TASK_QUEUE, {durable: true});
      ch.prefetch(1);
      startTaskExecutor(ch);
    })
    .catch(error => {
      logger.log('error', `Unable to establish connection to AMQP_HOST: ${AMQP_HOST}`, error);
      throw error;
    });
}

function startTaskExecutor(channel) {

  let waitTimeMs = 0;
  channel.consume(INCOMING_TASK_QUEUE, function (msg) {
    logger.log('info', 'record-update-worker: Received task', msg.content.toString());
    logger.log('info', `record-update-worker: Waiting ${waitTimeMs}ms before starting the task.`);

    setTimeout(() => {
      const taskProcessingTimer = createTimer();

      try {
        const task = readTask(msg);
        const {username, password} = readSessionToken(task.sessionToken);

        const client = createApiClient({
          ...defaultConfig,
          restApiUsername: username,
          restApiPassword: password
        });

        assertAlephHealth()
          .then(() => processTask(task, client))
          .then(taskResponse => {
            channel.sendToQueue(OUTGOING_TASK_QUEUE, Buffer.from(JSON.stringify(taskResponse)), {persistent: true});
          }).catch(error => {
            if (error instanceof RecordProcessingError) {
              logger.log('info', `record-update-worker: Processing failed: ${JSON.stringify(error)}`);
              const failedTask = markTaskAsFailed(error.task, error.message);
              channel.sendToQueue(OUTGOING_TASK_QUEUE, Buffer.from(JSON.stringify(failedTask)), {persistent: true});
            } else {
              logger.log('error', `record-update-worker: Processing failed: ${error}`);
              const failedTask = markTaskAsFailed(task, error.message);
              channel.sendToQueue(OUTGOING_TASK_QUEUE, Buffer.from(JSON.stringify(failedTask)), {persistent: true});
            }
          }).then(() => {
            const taskProcessingTimeMs = taskProcessingTimer.elapsed();

            logger.log('info', `record-update-worker: Task processed in ${taskProcessingTimeMs}ms.`);

            waitTimeMs = Math.max(0, minTaskIntervalSeconds * 1000 - taskProcessingTimeMs);

            if (waitTimeMs === 0) {
              logger.log('info', `record-update-worker: Processing was slower than MIN_TASK_INTERVAL_SECONDS, forcing wait time to ${SLOW_PROCESSING_WAIT_TIME_MS}ms.`);
              waitTimeMs = SLOW_PROCESSING_WAIT_TIME_MS;
            }

            channel.ack(msg);

          }).catch(error => {
            logger.log('error', error);
          });

      } catch (error) {
        //logger.log('error', 'Dropped invalid task', error);
        const {consumerTag, deliveryTag} = msg;
        logger.log('error', 'record-update-worker: Dropped invalid task', {consumerTag, deliveryTag}, error.message);
        channel.ack(msg);
        return;
      }

    }, waitTimeMs);

  });
}

function assertAlephHealth() {
  const waitTimeSeconds = ALEPH_UNAVAILABLE_WAIT_TIME / 1000;

  return new Promise((resolve) => {

    checkAndRetry();

    function checkAndRetry() {
      checkAlephHealth()
        .then(() => resolve())
        .catch(error => {

          logger.log('info', `Aleph is not healthy. Waiting ${waitTimeSeconds} seconds.`, error.message);
          setTimeout(() => checkAndRetry(), ALEPH_UNAVAILABLE_WAIT_TIME);
        });
    }
  });
}

function markTaskAsFailed(task, failedMessage) {
  return _.assign({}, task, {taskFailed: true, failureReason: failedMessage});
}

export function processTask(task, client) {
  const skipLocalSidCheckForRemoval = task.recordIdHints.melindaId !== undefined && task.recordIdHints.localId === undefined;

  const transformOptions = {
    deleteUnusedRecords: task.deleteUnusedRecords,
    skipLocalSidCheck: skipLocalSidCheckForRemoval,
    libraryTag: task.lowTag,
    expectedLocalId: task.recordIdHints.localId,
    bypassSIDdeletion: task.bypassSIDdeletion
  };

  logger.log('info', 'record-update-worker: Querying for melinda id');
  return findMelindaId(task).then(taskWithResolvedId => {
    logger.log('info', 'record-update-worker: Loading record', taskWithResolvedId.recordId);

    return client.read(taskWithResolvedId.recordId).then(loadResult => {
      const loadedRecord = loadResult.record;

      if (isComponentRecord(loadedRecord)) {
        throw new RecordProcessingError('Record is a component record. Record not updated.', taskWithResolvedId);
      }

      logger.log('info', 'record-update-worker: Transforming record', taskWithResolvedId.recordId);
      return transformRecord('REMOVE-LOCAL-REFERENCE', loadedRecord, transformOptions)
        .then(result => {
          return _.set(result, 'originalRecord', loadedRecord);
        });

    }).then(result => {
      const {record, report, originalRecord} = result;
      taskWithResolvedId.report = report;

      if (recordsEqual(record, originalRecord)) {
        throw new RecordProcessingError('Tietueessa ei tapahtunut muutoksia. Tietuetta ei päivitetty.', taskWithResolvedId);
      }

      logger.log('info', 'record-update-worker: Updating record', taskWithResolvedId.recordId);
      const recordId = getRecordId(record);
      return client.update(record, recordId).catch(convertMelindaApiClientErrorToError);
    }).then(response => {
      if (task.deleteUnusedRecords) {
        logger.log('info', 'record-update-worker: deleteUnusedRecords is true');
        logger.log('info', 'record-update-worker: Loading record', taskWithResolvedId.recordId);
        return client.read(taskWithResolvedId.recordId).then(loadResult => {
          const loadedRecord = loadResult.record;
          if (recordIsUnused(loadedRecord)) {
            logger.log('info', 'record-update-worker: Deleting unused record', taskWithResolvedId.recordId);
            markRecordAsDeleted(loadedRecord);
            const loadedRecordId = getRecordId(loadedRecord);
            return client.update(loadedRecord, loadedRecordId)
              .then(response => {
                taskWithResolvedId.report.push('Koko tietue poistettu.');
                return response;
              })
              .catch(convertMelindaApiClientErrorToError);
          } else {
            return response;
          }
        });

      } else {
        return response;
      }
    }).then(response => {
      logger.log('info', 'record-update-worker: Updated record', response.recordId);
      taskWithResolvedId.updateResponse = response;
      return taskWithResolvedId;
    }).catch(exceptCoreErrors(error => {
      throw new RecordProcessingError(error.message, taskWithResolvedId);
    }));
  }).catch(exceptCoreErrors(error => {
    if (error instanceof RecordProcessingError) {
      throw error;
    } else {
      throw new RecordProcessingError(error.message, task);
    }
  }));
}

function recordsEqual(recordA, recordB) {
  return recordA.toString() === recordB.toString();
}

function convertMelindaApiClientErrorToError(melindaApiClientError) {
  if (melindaApiClientError instanceof Error) {
    throw melindaApiClientError;
  } else {
    const message = _.get(melindaApiClientError, 'errors[0].message', 'Unknown melinda-api-client error');
    throw new Error(message);
  }
}

function findMelindaId(task) {

  const {recordIdHints} = task;

  const melindaIdLinks = _.get(recordIdHints, 'links', [])
    .map(link => link.toUpperCase())
    .map(link => link.startsWith('FCC') ? link.substr(3) : link);

  return resolveMelindaId(recordIdHints.melindaId, recordIdHints.localId, task.lowTag, melindaIdLinks)
    .then(recordId => {
      return _.assign({}, task, {recordId});
    });
}

function getRecordId(record) {
  const [f001] = record.get(/^001$/u);
  return f001.value;
}

function readTask(msg) {
  return JSON.parse(msg.content.toString());
}

export function RecordProcessingError(message, task) {
  const temp = Error.call(this, message);
  temp.name = this.name = 'RecordProcessingError';
  this.task = task;
  this.message = temp.message;
}

RecordProcessingError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: RecordProcessingError,
    writable: true,
    configurable: true
  }
});
