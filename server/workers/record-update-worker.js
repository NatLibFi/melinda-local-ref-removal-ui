/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* UI for removing references to local databases from Melinda
*
* Copyright (C) 2016-2017 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-local-ref-removal-ui
*
* melinda-local-ref-removal-ui program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-local-ref-removal-ui is distributed in the hope that it will be useful,
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
*/import amqp from 'amqplib';
import { readEnvironmentVariable, createTimer, exceptCoreErrors } from 'server/utils';
import { recordIsUnused, markRecordAsDeleted, isComponentRecord } from 'server/record-utils';
import { logger } from 'server/logger';
import MelindaClient from '@natlibfi/melinda-api-client';
import { readSessionToken } from 'server/session-crypt';
import { resolveMelindaId, findComponentIds } from '../record-id-resolution-service';
import _ from 'lodash';
import { transformRecord } from 'server/record-transform-service';
import { checkAlephHealth } from '../aleph-health-check-service';
import { startJob } from '../record-list-service';

const apiUrl = readEnvironmentVariable('MELINDA_API', null);
const minTaskIntervalSeconds = readEnvironmentVariable('MIN_TASK_INTERVAL_SECONDS', 10);
const SLOW_PROCESSING_WAIT_TIME_MS = 10000;
const ALEPH_UNAVAILABLE_WAIT_TIME = 10000;

const defaultConfig = {
  endpoint: apiUrl,
  user: '',
  password: ''
};

const AMQP_HOST = readEnvironmentVariable('AMQP_HOST');
const AMQP_USERNAME = readEnvironmentVariable('AMQP_USERNAME', 'guest', { hideDefaultValue: true });
const AMQP_PASSWORD = readEnvironmentVariable('AMQP_PASSWORD', 'guest', { hideDefaultValue: true });
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
  channel.consume(INCOMING_TASK_QUEUE, function(msg) {

    logger.log('info', 'record-update-worker: Received task', msg.content.toString());

    logger.log('info', `record-update-worker: Waiting ${waitTimeMs}ms before starting the task.`);
    setTimeout(() => {
      const taskProcessingTimer = createTimer();

      try {
        const task = readTask(msg);
        const {username, password} = readSessionToken(task.sessionToken);

        const client = new MelindaClient({
          ...defaultConfig,
          user: username,
          password: password
        });

        assertAlephHealth()
          .then(() => processTask(task, client))
          .then(taskResponse => {
            channel.sendToQueue(OUTGOING_TASK_QUEUE, new Buffer(JSON.stringify(taskResponse)), {persistent: true});
          }).catch(error => {

            if (error instanceof RecordProcessingError) {
              logger.log('info', 'record-update-worker: Processing failed:', error.message);
              const failedTask = markTaskAsFailed(error.task, error.message);
              channel.sendToQueue(OUTGOING_TASK_QUEUE, new Buffer(JSON.stringify(failedTask)), {persistent: true});
            } else {
              logger.log('error', 'record-update-worker: Processing failed:', error);
              const failedTask = markTaskAsFailed(task, error.message);
              channel.sendToQueue(OUTGOING_TASK_QUEUE, new Buffer(JSON.stringify(failedTask)), {persistent: true});
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

      } catch(error) {
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
  const MELINDA_API_NO_REROUTE_OPTS = {handle_deleted: 1};

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

    return client.loadRecord(taskWithResolvedId.recordId, MELINDA_API_NO_REROUTE_OPTS).then(loadedRecord => {

      if (isComponentRecord(loadedRecord) || hasHostLink(loadedRecord)) {
        //return checkComponentValidity(loadedRecord).then(processComponents).then(continueWithHost);
        taskWithResolvedId.report.push('Osakohde.');
       
        //taskWithResolvedId.hostInfo.push('Host');
        const hostLinks = getHostLinks(loadedRecord);
        taskWithResolvedId.hosts = hostLinks;
        
        //taskWithResolvedId.hosts.push(hostLinks);
        // check here if task includes hostData ie. should LOW-tag not be removed from record (in case of several hosts)
        if (hostLinks.length > 1) {
          throw new RecordProcessingError('Record is a component record with several host links. Record not updated.', taskWithResolvedId);
        }
      }
      
      if (taskWithResolvedId.componentList && taskWithResolvedId.componentList.length > 0) {
        return processComponents().then(continueWithHost);
      }
      else {
        return continueWithHost();
      }
      

      function processComponents() {
        logger.log('info', 'record-update-worker: Adding components to queue', taskWithResolvedId.recordId);
       
        const hostInfo = [taskWithResolvedId.recordId];
        const componentRecordHints = [];

        taskWithResolvedId.componentList.forEach(component => {
          componentRecordHints.push({melindaId: component});
        });


        let componentUserinfo = {}; 
        if (taskWithResolvedId.sessionToken) {
          componentUserinfo = readSessionToken(taskWithResolvedId.sessionToken);
        }
       
        const componentReplicateRecords = (taskWithResolvedId.bypassSIDdeletion);

        return startJob(componentRecordHints, taskWithResolvedId.lowTag, taskWithResolvedId.deleteUnusedRecords, componentReplicateRecords, taskWithResolvedId.sessionToken, componentUserinfo, hostInfo)
          .then( jobId => {
            const componentListReport='Created new job '+jobId+' for '+componentRecordHints.length+' component records.';
            taskWithResolvedId.report.push(componentListReport); 
            logger.log('info', 'record-update-worker: Created new job '+jobId+'for component records.', taskWithResolvedId.recordId);
            return Promise.resolve(taskWithResolvedId);
          });
      }

      function continueWithHost() {
        logger.log('info', 'record-update-worker: Transforming record', taskWithResolvedId.recordId);
        return transformRecord('REMOVE-LOCAL-REFERENCE', loadedRecord, transformOptions)
            .then(result => {
              return _.set(result, 'originalRecord', loadedRecord);
            });
      }


    }).then(result => {
      const {record, report, originalRecord} = result;
      taskWithResolvedId.report.push(...report); 

      if (recordsEqual(record, originalRecord)) {
        if (!(taskWithResolvedId.deleteUnusedRecords)) {
          throw new RecordProcessingError('Tietueessa ei tapahtunut muutoksia. Tietuetta ei päivitetty.', taskWithResolvedId);
        }
      }

      logger.log('info', 'record-update-worker: Updating record', taskWithResolvedId.recordId);
      return client.updateRecord(record).catch(convertMelindaApiClientErrorToError);
    }).then(response => {

      if (task.deleteUnusedRecords) {
        logger.log('info', 'record-update-worker: deleteUnusedRecords is true');
        logger.log('info', 'record-update-worker: Loading record', taskWithResolvedId.recordId);
        return client.loadRecord(response.recordId, MELINDA_API_NO_REROUTE_OPTS).then(loadedRecord => {
          if (recordIsUnused(loadedRecord) && recordHasNoArtoTag(loadedRecord) ) {
            logger.log('info', 'record-update-worker: Deleting unused record', taskWithResolvedId.recordId);
            markRecordAsDeleted(loadedRecord);
            return client.updateRecord(loadedRecord)
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

  const { recordIdHints } = task;

  const melindaIdLinks = _.get(recordIdHints, 'links', [])
    .map(link => link.toUpperCase())
    .map(link => link.startsWith('FCC') ? link.substr(3) : link);

  return resolveMelindaId(recordIdHints.melindaId, recordIdHints.localId, task.lowTag, melindaIdLinks)
    .then(recordId => {
      return _.assign({}, task, {recordId});
    }).then(task => {
      if (task.handleComponents) {
        return findComponentIds(task.recordId)
          .then(componentList => {
            return _.assign({}, task, {componentList: componentList}, {report: []});
          });
      }
      else {
        return _.assign({}, task, {report: ['Components not handled']});
      }
    });
}

function readTask(msg) {
  return JSON.parse(msg.content.toString());
}

function recordHasNoArtoTag(record){
  return !(record.containsFieldWithValue('960', 'a', 'ARTO'));
}

function hasHostLink(record) {
  return (record.fields && record.fields.filter(field => ['773'].some(tag => tag === field.tag)).length > 0);
}

function getHostLinks(record) {
  //return ['1234','1424'];
  const hostLinkSubfields = record.getFields('773').map(field => getSubfields(field,'w')
                                                   .map(subfield => subfield.value)
                                                   .filter(value => value.match(/^\(FI-MELINDA\)/)));

  return _.uniq(hostLinkSubfields.map(subfield => subfield[0].replace('(FI-MELINDA)','')));
  
}

function getSubfields(field, code) {
  return field.subfields.filter(sub => sub.code === code);
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
