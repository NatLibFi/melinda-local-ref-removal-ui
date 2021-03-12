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

import {expect} from 'chai';
import {connect, startJob} from './record-list-service';
import {__RewireAPI__ as AuthProviderRewireAPI} from './record-list-service';
import sinon from 'sinon';

describe('Record list service', () => {
  const TEST_RECORD_LIST = [1, 2, 3];
  let connectionStub;
  let channelStub;

  beforeEach(() => {
    channelStub = {
      assertQueue: sinon.spy(),
      sendToQueue: sinon.spy()
    };

    connectionStub = {
      createChannel: sinon.stub().resolves(channelStub)
    };
    AuthProviderRewireAPI.__Rewire__('amqp', {connect: sinon.stub().resolves(connectionStub)});
  });
  afterEach(() => {
    AuthProviderRewireAPI.__ResetDependency__('amqp');
  });

  describe('startJob', () => {
    beforeEach(() => {
      return connect().then(() => {
        startJob(TEST_RECORD_LIST, 'test', true, true);
      });
    });

    it('asserts both queues', () => {
      expect(channelStub.assertQueue.callCount).to.equal(2);
    });

    it('sends the job and tasks to the queues', () => {
      expect(channelStub.sendToQueue.callCount).to.equal(4);
    });

  });
});
