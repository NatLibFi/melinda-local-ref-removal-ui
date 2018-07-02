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
import { readEnvironmentVariable, getMelindaLoadUserByLowtag } from 'server/utils';
import { logger } from 'server/logger';
import _ from 'lodash';
import uuid from 'node-uuid';

const AMQP_HOST = readEnvironmentVariable('AMQP_HOST');
const AMQP_USERNAME = readEnvironmentVariable('AMQP_USERNAME', 'guest', { hideDefaultValue: true });
const AMQP_PASSWORD = readEnvironmentVariable('AMQP_PASSWORD', 'guest', { hideDefaultValue: true });
const TASK_QUEUE = 'task_queue';
const JOB_QUEUE = 'job_queue';

let channel;
export function connect() {
  return amqp.connect(`amqp://${AMQP_USERNAME}:${AMQP_PASSWORD}@${AMQP_HOST}`)
    .then(conn => conn.createChannel())
    .then(ch => channel = ch)
    .catch(error => {
      logger.log('error', `Unable to establish connection to AMQP_HOST: ${AMQP_HOST}`, error);
      throw error;
    });
}

export function startJob(records, lowTag, deleteUnusedRecords, replicateRecords, sessionToken, userinfo, hostInfo = [], handleComponents = true) {
  if (channel === undefined) {
    throw new Error('Queue for sending tasks is not available.');
  }

  if (!replicateRecords) {
    const loadUser = getMelindaLoadUserByLowtag(lowTag);
    if (loadUser === undefined) {
      throw new Error(`ReplicateRecords was set to ${replicateRecords}, but no load user was found for LOW: ${lowTag}`);
    }
    logger.log('info', `replicateRecords=${replicateRecords}, exchanging the sessionToken to ${loadUser.username}`);
    sessionToken = loadUser.sessionToken;
  }

  const bypassSIDdeletion = replicateRecords;

  channel.assertQueue(TASK_QUEUE, {durable: true});
  channel.assertQueue(JOB_QUEUE, {durable: true});

  const jobId = uuid.v4();
  const tasks = records.map(_.partial(createTask, jobId, sessionToken, lowTag, deleteUnusedRecords, bypassSIDdeletion, hostInfo, handleComponents));

  const jobPayload = new Buffer(JSON.stringify(createJob(jobId, tasks, userinfo)));
  // Node 6 has Buffer.from(msg) which should be used
  channel.sendToQueue(JOB_QUEUE, jobPayload, {persistent: true});

  tasks.forEach(task => {

    // Node 6 has Buffer.from(msg) which should be used
    channel.sendToQueue(TASK_QUEUE, new Buffer(JSON.stringify(task)), {persistent: true});
  });

  return Promise.resolve(jobId);
}


function createTask(jobId, sessionToken, lowTag, deleteUnusedRecords, bypassSIDdeletion, hostInfo, handleComponents, recordIdHints) {
  return {
    jobId,
    taskId: uuid.v4(),
    recordIdHints,
    lowTag,
    sessionToken,
    deleteUnusedRecords,
    bypassSIDdeletion,
    hostInfo,
    handleComponents
  };
}

function createJob(jobId, tasks, userinfo) {
  return {
    jobId,
    taskIdList: tasks.map(task => task.taskId),
    userinfo
  };
}
