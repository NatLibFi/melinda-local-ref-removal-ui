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
*/import {ReportEmail} from '../email-template';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import amqp from 'amqplib';
import { readEnvironmentVariable } from 'server/utils';
import { logger } from 'server/logger';
import _ from 'lodash';
import { mail } from '../mailer';

const AMQP_HOST = readEnvironmentVariable('AMQP_HOST');
const AMQP_USERNAME = readEnvironmentVariable('AMQP_USERNAME', 'guest', { hideDefaultValue: true });
const AMQP_PASSWORD = readEnvironmentVariable('AMQP_PASSWORD', 'guest', { hideDefaultValue: true });
const INCOMING_TASK_RESULT_QUEUE = 'task_result_queue';
const INCOMING_JOB_QUEUE = 'job_queue';
const FALLBACK_EMAIL = readEnvironmentVariable('FALLBACK_EMAIL', 'melinda-posti@helsinki.fi');

export default class ResultWorker {
  constructor() {
    this.orphanResults = [];
    this.currentJobs = new Map();
    this.completeJobs = {};
  }

  connect() {
    return amqp.connect(`amqp://${AMQP_USERNAME}:${AMQP_PASSWORD}@${AMQP_HOST}`)
      .then(conn => conn.createChannel())
      .then(ch => {
        ch.assertQueue(INCOMING_TASK_RESULT_QUEUE, {durable: true});
        ch.assertQueue(INCOMING_JOB_QUEUE, {durable: true});
        this.startTaskExecutor(ch);
      })
      .catch(error => {
        logger.log('error', `Unable to establish connection to AMQP_HOST: ${AMQP_HOST}`, error);
        throw error;
      });
  }

  startTaskExecutor(channel) {
    channel.consume(INCOMING_JOB_QUEUE, _.bind(this.handleIncomingJob, this, channel));
    channel.consume(INCOMING_TASK_RESULT_QUEUE, _.bind(this.handleIncomingTaskResult, this, channel));
  }

  handleIncomingTaskResult(channel, msg) {
    logger.log('debug', 'result-worker: Received task', msg.content.toString());

    try {
      const taskResult = readTaskResult(msg);

      const {jobId} = taskResult;
      let jobAggregate = this.currentJobs.get(jobId);
      if (jobAggregate === undefined) {
        this.orphanResults.push(taskResult);
      } else {
        this.markTaskCompleted(channel, jobAggregate, taskResult);
      }

    } catch(error) {
      const {consumerTag, deliveryTag} = msg;
      logger.log('error', 'Error handling task', {consumerTag, deliveryTag}, error);
    }
  }

  handleIncomingJob(channel, msg) {
    try {
      const job = readJob(msg);

      const {jobId, taskIdList} = job;
      logger.log('debug', 'result-worker: Job started ', jobId);

      let jobAggregate = this.currentJobs.get(jobId);
      if (jobAggregate === undefined) {
        jobAggregate = {
          job: job,
          msg: msg,
          inCompleteTasks: new Map(),
          email: job.userinfo.email
        };
        this.currentJobs.set(jobId, jobAggregate);
      }

      taskIdList.forEach(taskId => {
        jobAggregate.inCompleteTasks.set(taskId, true);
      });

      this.orphanResults.filter(taskResult => taskResult.jobId == jobId).forEach(taskResult => {
        this.markTaskCompleted(channel, jobAggregate, taskResult);
      });
      // TODO: Improve with reduce
      this.orphanResults = this.orphanResults.filter(taskResult => taskResult.jobId !== jobId);


    } catch(error) {
      logger.log('error', 'Error handling job', msg, error);
    }

  }

  markTaskCompleted(channel, jobAggregate, taskResult) {
    const {jobId, taskId} = taskResult;
    logger.log('debug', 'result-worker: Task complete ', jobId, taskId);
    jobAggregate.inCompleteTasks.delete(taskId);
    if (this.completeJobs[jobId] === undefined) {
      this.completeJobs[jobId] = [];
    }
    this.completeJobs[jobId].push(taskResult);
    if (jobAggregate.inCompleteTasks.size === 0) {


      channel.ack(jobAggregate.msg);
      this.completeJobs[jobId].forEach(taskResult => {
        channel.ack(taskResult.msg);
      });

      logJobResult(jobId, this.completeJobs[jobId]);
      dispatchEmail(jobId, jobAggregate.email, this.completeJobs[jobId]);

      delete(this.completeJobs[jobId]);
      this.currentJobs.delete(jobId);
    }
  }

  getStatusInfo() {
    const statusForCurrentJobs = Object.create(null);
    for (let [k,v] of this.currentJobs) {

      const allTasksCount = v.job.taskIdList.length;
      const incompleteTaskCount = v.inCompleteTasks.size;

      statusForCurrentJobs[k] = {
        allTasksCount,
        incompleteTaskCount,
        jobId: k
      };
    }

    return statusForCurrentJobs;

  }
}

function logJobResult(jobId, taskResults) {
  logger.log('info', 'result-worker: Job complete ', jobId);
  taskResults.forEach(taskResult => {
    const formattedResult = formatTaskResult(taskResult);
    logger.log('info', `${jobId} ${formattedResult}`);
  });
}

function dispatchEmail(jobId, emailAddress, taskResults) {
  logger.log('info', `Sending results of job ${jobId} to ${emailAddress}`);

  const htmlEmailContent = ReactDOMServer.renderToStaticMarkup(<ReportEmail taskResults={taskResults} jobId={jobId} />);

  if (emailAddress == null ) {
    emailAddress = FALLBACK_EMAIL;
  }

  mail({
    to: emailAddress,
    subject: `Melinda-poistot ajo ${jobId} valmistui`,
    html: htmlEmailContent
  }).then(info => {
    logger.log('info', 'message sent', info);
  }).catch(error => {
    logger.log('error', 'Failed to send email', error);
  });
}

function formatTaskResult(taskResult) {
  const {lowTag} = taskResult;
  const recordId = _.get(taskResult, 'recordId', 'ID-NOT-FOUND');
  const localId = _.get(taskResult.recordIdHints, 'localId' ,'');

  if (taskResult.taskFailed) {
    return `${recordId} ${localId} ${lowTag} Error: ${taskResult.failureReason}`;
  } else {
    const report = _.get(taskResult, 'report', []).join(', ');
    const {code, message} = _.get(taskResult.updateResponse.messages, '[0]', {});
    return `${recordId} ${localId} ${lowTag} ${code} ${message} ${report}`;
  }
}

function readTaskResult(msg) {
  const taskResult = JSON.parse(msg.content.toString());
  return {
    msg,
    ...taskResult
  };
}

function readJob(msg) {
  return JSON.parse(msg.content.toString());
}
