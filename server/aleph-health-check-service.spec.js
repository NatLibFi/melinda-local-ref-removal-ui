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

import chai from 'chai';
import {checkAlephHealth} from './aleph-health-check-service';
import {__RewireAPI__ as RewireAPI} from './aleph-health-check-service';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import {readEnvironmentVariable} from 'server/utils';

chai.use(chaiAsPromised);
var expect = chai.expect;
const apiUrl = readEnvironmentVariable('MELINDA_API', null);
const alephUrl = readEnvironmentVariable('ALEPH_URL');

const fakeApiUrl = apiUrl;
const fakeXServerUrl = `${alephUrl}/X`;

const FAKE_RESULT_OK = {status: 200};
const FAKE_RESULT_ERROR = {status: 503};

describe('Aleph health check service', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub();
    RewireAPI.__Rewire__('fetch', fetchStub);

  });
  afterEach(() => {
    RewireAPI.__ResetDependency__('fetch');
  });

  describe('checkAlephHealth', () => {

    describe('when aleph is working properly', () => {

      beforeEach(() => {
        fetchStub.withArgs(fakeApiUrl).resolves(FAKE_RESULT_OK);
        fetchStub.withArgs(fakeXServerUrl).resolves(FAKE_RESULT_OK);
      });

      it('resolves the promise', () => {
        return expect(checkAlephHealth()).to.be.fulfilled;
      });

    });

    describe('when X-server is misbehaving', () => {

      beforeEach(() => {

        fetchStub.withArgs(fakeApiUrl).resolves(FAKE_RESULT_OK);
        fetchStub.withArgs(fakeXServerUrl).resolves(FAKE_RESULT_ERROR);

      });

      it('rejects the promise with error', () => {
        return expect(checkAlephHealth()).to.be.rejectedWith('X-Server failed. status=503');
      });

    });

    describe('when api is misbehaving', () => {

      beforeEach(() => {

        fetchStub.withArgs(fakeApiUrl).resolves(FAKE_RESULT_ERROR);
        fetchStub.withArgs(fakeXServerUrl).resolves(FAKE_RESULT_OK);

      });

      it('rejects the promise with error', () => {
        return expect(checkAlephHealth()).to.be.rejectedWith('Melinda api failed. status=503');
      });

    });
  });
});
