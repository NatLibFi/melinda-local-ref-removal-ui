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

import sinon from 'sinon';
import {expect} from 'chai';
import ResultWorker from './result-worker';
import {__RewireAPI__ as ComponentRewriteApi} from './result-worker';

describe('result worker', function () {
  let resultWorker;
  let logSpy;
  beforeEach(() => {
    logSpy = sinon.spy();
    ComponentRewriteApi.__Rewire__('mail', sinon.stub().resolves({}));
    ComponentRewriteApi.__Rewire__('logger', {log: logSpy});

    resultWorker = new ResultWorker();
  });

  let job1 = createMessage({
    jobId: 'job-1-id',
    taskIdList: [11, 12],
    userinfo: {
      email: 'test-email'
    }
  });

  let task11 = createMessage({jobId: 'job-1-id', taskId: 11, updateResponse: {messages: [{code: 18}]}});
  let task12 = createMessage({jobId: 'job-1-id', taskId: 12, updateResponse: {messages: [{code: 18}]}});
  let task22 = createMessage({jobId: 'job-2-id', taskId: 22, updateResponse: {messages: [{code: 18}]}});

  describe('when job is not finished', function () {
    let channel;
    beforeEach(() => {
      channel = {
        ack: sinon.spy()
      };

      resultWorker.handleIncomingJob(channel, job1);
      resultWorker.handleIncomingTaskResult(channel, task11);
    });

    it('does not call ack for any message', function () {
      expect(channel.ack.callCount).to.equal(0);
    });
    it('adds job to currentJobs', () => {
      expect(Array.from(resultWorker.currentJobs.keys())).to.include('job-1-id');
    });
  });

  describe('when job is finished', function () {
    let channel;
    beforeEach(() => {
      channel = {
        ack: sinon.spy()
      };

      resultWorker.handleIncomingJob(channel, job1);
      resultWorker.handleIncomingTaskResult(channel, task11);
      resultWorker.handleIncomingTaskResult(channel, task12);
    });

    it('calls ack for all results and for the whole job', function () {
      expect(channel.ack.callCount).to.equal(3);
    });
    it('removes the job from currentJobs', () => {
      expect(Array.from(resultWorker.currentJobs.keys())).not.to.include('job-1-id');
    });
    it('removes the job from completeJobs', () => {
      expect(Object.keys(resultWorker.completeJobs)).not.to.include('job-1-id');
    });
  });

  describe('when results come before job definition', function () {
    let channel;
    beforeEach(() => {
      channel = {
        ack: sinon.spy()
      };

      resultWorker.handleIncomingTaskResult(channel, task11);
      resultWorker.handleIncomingTaskResult(channel, task12);
      resultWorker.handleIncomingTaskResult(channel, task22);
    });

    it('does not call ack for any message', function () {
      expect(channel.ack.callCount).to.equal(0);
    });

    describe('when job def comes', () => {
      beforeEach(() => {
        resultWorker.handleIncomingJob(channel, job1);
      });
      it('calls ack for all results and for the whole job', function () {
        expect(channel.ack.callCount).to.equal(3);
      });
      it('removes the job from currentJobs', () => {
        expect(Array.from(resultWorker.currentJobs.keys())).not.to.include('job-1-id');
      });
      it('removes the job from completeJobs', () => {
        expect(Object.keys(resultWorker.completeJobs)).not.to.include('job-1-id');
      });
      it('removes the tasks from orphan tasks', () => {
        expect(resultWorker.orphanResults.map(r => r.taskId)).not.to.include(11);
        expect(resultWorker.orphanResults.map(r => r.taskId)).not.to.include(12);
      });
      it('keeps the orphan tasks that are not related to completed job', () => {
        expect(resultWorker.orphanResults.map(r => r.taskId)).to.eql([22]);
      });
    });
  });
});

function createMessage(obj) {
  return {content: JSON.stringify(obj)};
}
