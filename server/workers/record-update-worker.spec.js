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
*/import {expect} from 'chai';
import { processTask, RecordProcessingError } from './record-update-worker';
import sinon from 'sinon';
import { __RewireAPI__ as RewireAPI } from './record-update-worker';
import { FAKE_RECORD, FAKE_RECORD_WITHOUT_LIBRARY_SPECIFIC_INFO, 
          FAKE_RECORD_ONLY_LOW_TEST, FAKE_RECORD_2_LOW, FAKE_RECORD_WITH_LOW_TEST_REMOVED, 
          FAKE_RECORD_WITH_ARTO, FAKE_RECORD_TWO_COMPONENT_LINKS, FAKE_RECORD_COMPONENT_BOTH, } from '../test_helpers/fake-data';
import MarcRecord from 'marc-record-js';
import _ from 'lodash';

describe('Record update worker', () => {

  const TEST_UPDATE_RESPONSE = {recordId: 33};
  const fakeTask = {
    recordIdHints: { melindaId: 3},
    lowTag: 'test'
  };

  let resolveMelindaIdStub;
  let findComponentIdsStub;
  let loggerStub;

  beforeEach(() => {
    resolveMelindaIdStub = sinon.stub();
    findComponentIdsStub = sinon.stub();
    loggerStub = { log: sinon.stub() };

    RewireAPI.__Rewire__('resolveMelindaId', resolveMelindaIdStub);
    RewireAPI.__Rewire__('findComponentIds', findComponentIdsStub);
    RewireAPI.__Rewire__('logger', loggerStub);
  });
  afterEach(() => {
    RewireAPI.__ResetDependency__('resolveMelindaId');
    RewireAPI.__ResetDependency__('findComponentIds');
    RewireAPI.__ResetDependency__('logger');
  });

  describe('processTask', () => {

    let clientStub;
    let result;
    let error;
    beforeEach(() => {
      result = undefined;
      error = undefined;
    });

    describe('when everything works', () => {

      beforeEach(() => {
        resolveMelindaIdStub.resolves(3);

        result = undefined;
        clientStub = createClientStub();
        clientStub.loadRecord.resolves(FAKE_RECORD);
        clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

        return processTask(fakeTask, clientStub).then(res => result = res);
      });

      it('sets the update response to result', () => {
        expect(result.updateResponse).to.eql(TEST_UPDATE_RESPONSE);
      });

      it('keeps the recordId in the response', () => {
        expect(result.recordId).to.equal(3);
      });

    });

    describe('when record is invalid', () => {
      const INVALID_RECORD = {};

      beforeEach(() => {
        resolveMelindaIdStub.resolves(3);

        result = undefined;
        clientStub = createClientStub();
        clientStub.loadRecord.resolves(INVALID_RECORD);
        clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

        return processTask(fakeTask, clientStub)
          .then(res => result = res)
          .catch(err => error = err);
      });

      it('results in error', () => {
        expect(error.message).to.equal('Invalid record');
      });
      
      it('rejects with processing error', () => {
        expect(error).to.be.instanceof(RecordProcessingError);
      });

    });

    describe('when loading a record fails', () => {
      
      const TEST_LOAD_ERROR = new Error('Error loading record');

      beforeEach(() => {
        resolveMelindaIdStub.resolves(3);
        clientStub = createClientStub();
        clientStub.loadRecord.rejects(TEST_LOAD_ERROR);
        clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

        return processTask(fakeTask, clientStub)
          .then(res => result = res)
          .catch(err => error = err);
      });

      it('rejects with processing error', () => {
        expect(error).to.be.instanceof(RecordProcessingError);
      });

      it('keeps the recordId in the response', () => {
        expect(error.task.recordId).to.equal(3);
      });

      it('sets the error to error message', () => {
        expect(error.message).to.equal(TEST_LOAD_ERROR.message);
      });

    });

    describe('when updating a record fails', () => {
      
      const TEST_UPDATE_ERROR = new Error('Error updating record');

      beforeEach(() => {
        resolveMelindaIdStub.resolves(3);
        clientStub = createClientStub();
        clientStub.loadRecord.resolves(FAKE_RECORD);
        clientStub.updateRecord.rejects(TEST_UPDATE_ERROR);

        return processTask(fakeTask, clientStub)
          .then(res => result = res)
          .catch(err => error = err);
      });

      it('keeps the recordId in the response', () => {
        expect(error.task.recordId).to.equal(3);
      });

      it('rejects with error message from updateRecord', () => {
        expect(error.message).to.equal(TEST_UPDATE_ERROR.message);
      });

      it('rejects with processing error', () => {
        expect(error).to.be.instanceof(RecordProcessingError);
      });

    });

    describe('when Melinda record id resolution works', () => {

      const fakeTaskWithLocalID = {
        recordIdHints: { localId: 3 },
        lowTag: 'test'
      };

      beforeEach(() => {
        resolveMelindaIdStub.resolves(33);
        clientStub = createClientStub();
        clientStub.loadRecord.resolves(FAKE_RECORD);
        clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

        return processTask(fakeTaskWithLocalID, clientStub)
          .then(res => result = res);
          
      });

      it('sets the recordId to resolved value', () => {
        expect(result.recordId).to.equal(33);
      });

    });
    
    describe('when Melinda record id resolution fails', () => {

      const fakeErrorMessage = 'fake-error-message';

      const fakeTaskWithLocalID = {
        recordIdHints: { localId: 3 }
      };

      beforeEach(() => {
        resolveMelindaIdStub.rejects(new Error(fakeErrorMessage));
        clientStub = createClientStub();
        clientStub.loadRecord.resolves({});
        clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

        return processTask(fakeTaskWithLocalID, clientStub)
          .then(res => result = res)
          .catch(err => error = err);
      });

      it('rejects with processing error', () => {
        expect(error).to.be.instanceof(RecordProcessingError);
      });

      it('sets the error message', () => {
        expect(error.message).to.equal(fakeErrorMessage);
      });
    });


    describe('when handleComponents option is true', () => {

      const fakeTaskWithLocalID = {
        recordIdHints: { localId: 3 },
        lowTag: 'test',
        handleComponents: true,
        bypassSIDdeletion: true
      };

      beforeEach(() => {
        resolveMelindaIdStub.resolves(33);
        findComponentIdsStub.resolves(['1','2','3','4','5','6']);
        clientStub = createClientStub();
        clientStub.loadRecord.resolves(FAKE_RECORD);
        clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

        return processTask(fakeTaskWithLocalID, clientStub)
          .then(res => result = res);
          
      });

      it('sets the recordId to resolved value', () => {
        expect(result.recordId).to.equal(33);
      });

      it('sets compomentList to an array of component recordIds', () => {
        expect(result.componentList).to.be.a('Array').that.has.members(['1','2','3','4','5','6']);
      });



    });

    describe('when handleComponents option is false', () => {

      const fakeTaskWithLocalID = {
        recordIdHints: { localId: 3 },
        lowTag: 'test'
      };

      beforeEach(() => {
        resolveMelindaIdStub.resolves(33);
        findComponentIdsStub.resolves(['1','2','3','4','5','6']);
        clientStub = createClientStub();
        clientStub.loadRecord.resolves(FAKE_RECORD);
        clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

        return processTask(fakeTaskWithLocalID, clientStub)
          .then(res => result = res);
          
      });

      it('does not set componentList', () => {
        expect(result).not.have.property('componentList');
      });

      //it('should report that components were not handled', () => {
      //  expect(result.report).to.include('Components not handled.');
      //});

    });

    describe('when delete unused records option is true', () => {
      describe('when a record has none of the following fields left: LOW/850/852/866', () => {
         
        beforeEach(() => {
          resolveMelindaIdStub.resolves(3);

          result = undefined;
          clientStub = createClientStub();
          clientStub.loadRecord.onCall(0).resolves(record(FAKE_RECORD_ONLY_LOW_TEST));
          clientStub.loadRecord.onCall(1).resolves(record(FAKE_RECORD_WITH_LOW_TEST_REMOVED));
          clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

          const task = _.assign({}, fakeTask, {deleteUnusedRecords: true});
          return processTask(task, clientStub).then(res => result = res);
        });

        it('should call updateRecord with deleted record', () => {
          expect(clientStub.updateRecord.callCount).to.equal(2);

          const secondCallArgument = clientStub.updateRecord.getCall(1).args[0];
          expect(secondCallArgument.isDeleted()).to.equal(true);
          
        });

        it('should report that the record was deleted', () => {
          expect(result.report).to.include('Koko tietue poistettu.');
        });

      });

      describe('when there was no changes, but record is unused', () => {
         
        beforeEach(() => {
          resolveMelindaIdStub.resolves(3);

          result = undefined;
          clientStub = createClientStub();
          clientStub.loadRecord.onCall(0).resolves(record(FAKE_RECORD_WITHOUT_LIBRARY_SPECIFIC_INFO));
          clientStub.loadRecord.onCall(1).resolves(record(FAKE_RECORD_WITHOUT_LIBRARY_SPECIFIC_INFO));
          clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

          const task = _.assign({}, fakeTask, {deleteUnusedRecords: true});
          return processTask(task, clientStub).then(res => result = res);
        });

        it('should call updateRecord with deleted record', () => {
          expect(clientStub.updateRecord.callCount).to.equal(2);

          const secondCallArgument = clientStub.updateRecord.getCall(1).args[0];
          expect(secondCallArgument.isDeleted()).to.equal(true);
          
        });

        it('should report that the record was deleted', () => {
          expect(result.report).to.include('Koko tietue poistettu.');
        });

      });

      describe('when record still has some LOW fields left', () => {
        beforeEach(() => {
          resolveMelindaIdStub.resolves(3);

          result = undefined;
          clientStub = createClientStub();
          clientStub.loadRecord.resolves(record(FAKE_RECORD_2_LOW));
          clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

          const task = _.assign({}, fakeTask, {deleteUnusedRecords: true});
          return processTask(task, clientStub).then(res => result = res);
        });

        it('should not try to call updateRecord with deleted record', () => {
          expect(clientStub.updateRecord.callCount).to.equal(1);

          const callArgument = clientStub.updateRecord.getCall(0).args[0];
          expect(callArgument.isDeleted()).to.equal(false);
          
        });
      });

      describe('when record has ARTO tag 960 left', () => {
        beforeEach(() => {
          resolveMelindaIdStub.resolves(3);

          result = undefined;
          clientStub = createClientStub();
          clientStub.loadRecord.resolves(record(FAKE_RECORD_WITH_ARTO));
          clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

          const task = _.assign({}, fakeTask, {deleteUnusedRecords: true});
          return processTask(task, clientStub).then(res => result = res);
        });

        it('should not try to call updateRecord with deleted record', () => {
          expect(clientStub.updateRecord.callCount).to.equal(1);

          const callArgument = clientStub.updateRecord.getCall(0).args[0];
          expect(callArgument.isDeleted()).to.equal(false);
          
        });
      });

    });

    describe('when nothing changes in the processed record', () => {

      beforeEach(() => {
        resolveMelindaIdStub.resolves(3);

        clientStub = createClientStub();
        clientStub.loadRecord.resolves(FAKE_RECORD_WITHOUT_LIBRARY_SPECIFIC_INFO);
     
        return processTask(fakeTask, clientStub)
          .then(res => result = res)
          .catch(err => error = err);
      });

      it('rejects with processing error', () => {
        expect(error).to.be.instanceof(RecordProcessingError);
      });

      it('sets the error message', () => {
        expect(error.message).to.equal('Tietueessa ei tapahtunut muutoksia. Tietuetta ei päivitetty.');
      });

      it('does not call updateRecord', () => {
        expect(clientStub.updateRecord.callCount).to.equal(0);
      });
    });
    
    describe('when record is component with several links', () => {

      beforeEach(() => {
        resolveMelindaIdStub.resolves(3);

        clientStub = createClientStub();
        clientStub.loadRecord.resolves(FAKE_RECORD_TWO_COMPONENT_LINKS);
     
        return processTask(fakeTask, clientStub)
          .then(res => result = res)
          .catch(err => error = err);
      });

      it('should report that the record was a component record', () => {
        expect(error.task.report).to.include('Osakohde.');
      });

      it('should have array of host links', () => {
        expect(error.task.hosts).to.be.a('Array').that.has.members(['123456','456123']);
      });

      it('rejects with processing error', () => {
        expect(error).to.be.instanceof(RecordProcessingError);
      });

      it('sets the error message', () => {
        expect(error.message).to.equal('Record is a component record with several host links. Record not updated.');
      });

      it('does not call updateRecord', () => {
        expect(clientStub.updateRecord.callCount).to.equal(0);
      });

    });

    describe('when record is component with just one link', () => {

      beforeEach(() => {
        resolveMelindaIdStub.resolves(3);

        result = undefined;
        clientStub = createClientStub();
        clientStub.loadRecord.resolves(FAKE_RECORD_COMPONENT_BOTH);
        clientStub.updateRecord.resolves(TEST_UPDATE_RESPONSE);

        return processTask(fakeTask, clientStub).then(res => result = res);
      });

      it('should report that the record was a component record', () => {
        expect(result.report).to.include('Osakohde.');
      });

      it('sets the update response to result', () => {
        expect(result.updateResponse).to.eql(TEST_UPDATE_RESPONSE);
      });

      it('keeps the recordId in the response', () => {
        expect(result.recordId).to.equal(3);
      });

    });
  
  });

});

function createClientStub() {
  return {
    loadRecord: sinon.stub(),
    updateRecord: sinon.stub(),
    createRecord: sinon.stub()
  };
}

function record(record) {
  return new MarcRecord(record);
}
