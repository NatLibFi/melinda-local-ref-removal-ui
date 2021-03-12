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
*/import { Map } from 'immutable';
import {SET_SELECTED_LOW_TAG, SET_RECORD_ID_LIST, SUBMIT_JOB_START, SUBMIT_JOB_SUCCESS, SUBMIT_JOB_FAIL, SET_DELETE_OPTION, SET_REPLICATE_OPTION} from '../constants/action-type-constants';
import { RESET_WORKSPACE } from '../constants/action-type-constants';

const INITIAL_STATE = Map({
  rawRecordIdRows: [],
  lowtag: undefined,
  submitStatus: 'NOT_SUBMITTED',
  submitJobError: undefined,
  deleteUnusedRecords: false,
  replicateRecords: false
});

export default function session(state = INITIAL_STATE, action) {
  switch (action.type) {
  case SET_SELECTED_LOW_TAG:
    return setLowTag(state, action.lowtag);
  case SET_DELETE_OPTION:
    return setDeleteOption(state, action.checked);
  case SET_REPLICATE_OPTION:
    return setReplicateOption(state, action.checked);
  case SET_RECORD_ID_LIST:
    return setRecordIdList(state, action.list);
  case SUBMIT_JOB_START:
    return setSubmitJobStatus(state, 'ONGOING');
  case SUBMIT_JOB_SUCCESS:
    return setSubmitJobStatus(state, 'SUCCESS');
  case SUBMIT_JOB_FAIL:
    return setSubmitJobStatusFailed(state, action.error);
  case RESET_WORKSPACE:
    return setLowTag(INITIAL_STATE, state.get('lowtag'));
  }
  return state;
}

function setLowTag(state, lowtag) {
  return state.set('lowtag', lowtag);
}
function setDeleteOption(state, enabled) {
  return state.set('deleteUnusedRecords', enabled);
}

function setReplicateOption(state, enabled) {
  return state.set('replicateRecords', enabled);
}

function setRecordIdList(state, list) {
  return state.set('rawRecordIdRows', list);
}

function setSubmitJobStatus(state, status) {
  return state.set('submitStatus', status);
}
function setSubmitJobStatusFailed(state, error) {
  return state.set('submitStatus', 'FAILED').set('submitJobError', error);
}
