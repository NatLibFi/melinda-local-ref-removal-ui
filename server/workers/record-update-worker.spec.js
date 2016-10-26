import {expect} from 'chai';
import { processTask, RecordProcessingError } from './record-update-worker';
import sinon from 'sinon';
import sinonAsPromised from 'sinon-as-promised'; // eslint-disable-line
import { __RewireAPI__ as RewireAPI } from './record-update-worker';
import { FAKE_RECORD } from '../test_helpers/fake-data';


describe('Record update worker', () => {

  const TEST_UPDATE_RESPONSE = {recordId: 33};
  const fakeTask = {
    recordIdHints: { melindaId: 3},
    lowTag: 'test'
  };

  let resolveMelindaIdStub;
  let loggerStub;

  beforeEach(() => {
    resolveMelindaIdStub = sinon.stub();
    loggerStub = { log: sinon.stub() };

    RewireAPI.__Rewire__('resolveMelindaId', resolveMelindaIdStub);
    RewireAPI.__Rewire__('logger', loggerStub);
  });
  afterEach(() => {
    RewireAPI.__ResetDependency__('resolveMelindaId');
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

  });
});

function createClientStub() {
  return {
    loadRecord: sinon.stub(),
    updateRecord: sinon.stub(),
    createRecord: sinon.stub()
  };
}
