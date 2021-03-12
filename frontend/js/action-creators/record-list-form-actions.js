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

import { exceptCoreErrors, errorIfStatusNot } from '../utils';
import { FetchNotOkError } from '../errors';
import HttpStatus from 'http-status';
import { validRecordList } from '../selectors/record-list-selectors';

import {SET_SELECTED_LOW_TAG, SET_RECORD_ID_LIST, SUBMIT_JOB_START, SUBMIT_JOB_SUCCESS, SUBMIT_JOB_FAIL, SET_DELETE_OPTION, SET_REPLICATE_OPTION} from '../constants/action-type-constants';

export function setSelectedLowTag(lowtag) {
  return { 'type': SET_SELECTED_LOW_TAG, lowtag };
}
export function setDeleteOption(checked) {
  return { 'type': SET_DELETE_OPTION, checked };
}
export function setReplicateOption(checked) {
  return { 'type': SET_REPLICATE_OPTION, checked };
}
export function setRecordIdList(list) {
  return { 'type': SET_RECORD_ID_LIST, list };
}

export function submitJobStarted() {
  return { 'type': SUBMIT_JOB_START };
}
export function submitJobSuccess() {
  return { 'type': SUBMIT_JOB_SUCCESS };
}
export function submitJobFailure(error) {
  return { 'type': SUBMIT_JOB_FAIL, error };
}

export function submitJob() {
  const recordListBasePath = __DEV__ ? 'http://localhost:3001/records': '/records';

  return function(dispatch, getState) {

    const records = validRecordList(getState());
    const lowTag = getState().getIn(['recordListForm', 'lowtag']);
    const deleteUnusedRecords = getState().getIn(['recordListForm', 'deleteUnusedRecords']);
    const replicateRecords = getState().getIn(['recordListForm', 'replicateRecords']);

    dispatch(submitJobStarted());

    const fetchOptions = {
      method: 'POST',
      body: JSON.stringify({ records, lowTag, deleteUnusedRecords, replicateRecords }),
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      credentials: 'include'
    };

    return fetch(`${recordListBasePath}/`, fetchOptions)
      .then(errorIfStatusNot(HttpStatus.OK))
      .then(() => {
        dispatch(submitJobSuccess());
      }).catch(exceptCoreErrors((error) => {
        console.log(error); // eslint-disable-line no-console
        if (error instanceof FetchNotOkError) {
          switch (error.response.status) {
          case HttpStatus.BAD_REQUEST: return dispatch(submitJobFailure(new Error('Lähettäminen epäonnistui koska tietuelistauksen tiedoissa oli virheitä.')));
          case HttpStatus.INTERNAL_SERVER_ERROR: return dispatch(submitJobFailure(new Error('Tietuelistauksen lähettämisessä tapahtui virhe. Yritä hetken päästä uudestaan.')));
          }
        }

        dispatch(submitJobFailure(new Error('There has been a problem with operation: ' + error.message)));
      }));

  };
}

