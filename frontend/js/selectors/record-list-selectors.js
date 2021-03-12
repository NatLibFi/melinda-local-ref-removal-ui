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
*/import _ from 'lodash';
import {createSelector} from 'reselect';

const recordList = state => state.getIn(['recordListForm', 'rawRecordIdRows']);

export const validRecordList = createSelector([recordList], (recordList) => {
  return recordList.filter(row => row !== undefined);
});

export const validRecordCount = createSelector(
  [validRecordList],
  (validRecordList) => {
    return validRecordList.length;
  }
);

export const recordParseErrors = createSelector([recordList], (recordList) => {
  return recordList.reduce((acc, row, i) => {
    if (row instanceof Error) {
      acc.push({row: i, error: row});
    }
    return acc;
  }, []);
});

const submitStatus = state => state.getIn(['recordListForm', 'submitStatus']);
const lowtag = state => state.getIn(['recordListForm', 'lowtag']);

export const editorIsReadOnly = createSelector([submitStatus], submitStatus => {
  return _.includes(['ONGOING', 'SUCCESS'], submitStatus);
});

export const submitEnabled = createSelector(
  [validRecordCount, recordParseErrors, submitStatus, lowtag],
  (validRecordCount, recordParseErrors, submitStatus, lowtag) => {

    if (recordParseErrors.length !== 0) {
      return {value: false, reason: 'Tietuelistauksessa on virheitä.'};
    }
    if (validRecordCount === 0) {
      return {value: false, reason: 'Listauksessa ei ole yhtään tietuetta.'};
    }
    if (lowtag === undefined) {
      return {value: false, reason: 'Tietokantatunnusta ei ole valittu.'};
    }
    if (submitStatus === 'NOT_SUBMITTED' || submitStatus === 'FAILED') {
      return {value: true};
    }
    return {value: false};
  }
);
