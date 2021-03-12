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

import _ from 'lodash';
import xml2js from 'xml2js';
import promisify from 'es6-promisify';
import fetch from 'isomorphic-fetch';
import {readEnvironmentVariable} from 'server/utils';
import {createApiClient} from '@natlibfi/melinda-rest-api-client';

const parseXMLStringToJSON = promisify(xml2js.parseString);


const restApiUrl = readEnvironmentVariable('REST_API_URL');
const restApiUsername = readEnvironmentVariable('REST_API_USERNAME');
const restApiPassword = readEnvironmentVariable('REST_API_PASSWORD');
const alephUrl = readEnvironmentVariable('ALEPH_URL');
const base = readEnvironmentVariable('ALEPH_INDEX_BASE', 'fin01');

const ALEPH_ERROR_EMPTY_SET = 'empty set';
const melindaClientConfig = {
  restApiUrl,
  restApiUsername,
  restApiPassword
};

export function resolveMelindaId(melindaId, localId, libraryTag, links) {
  if (libraryTag === undefined) {
    throw new Error('Library tag cannot be undefined');
  }

  return Promise.all([
    querySIDAindex(localId, libraryTag, links),
    queryMIDDRindex(melindaId, links),
    queryXServer(melindaId, links)
  ])
    .then(([sidaRecordIdList, middrRecordIdList, XServerRecordIdList]) => {

      const combinedResolvedIdList = _.uniq(_.concat(sidaRecordIdList, middrRecordIdList, XServerRecordIdList));
      return combinedResolvedIdList;

    })
    .then(validateResult)
    .then(recordIdList => {
      return _.head(recordIdList);
    });
}

function querySIDAindex(localId, libraryTag, links) {
  const normalizedLibraryTag = libraryTag.toLowerCase();

  const linksPart = links.map(link => `sida=FCC${_.padStart(link, 9, '0')}${normalizedLibraryTag}`);

  const query = [`sida=${localId}${normalizedLibraryTag}`].concat(linksPart).join(' OR ');
  const requestUrl = `${alephUrl}/X?op=find&request=${encodeURIComponent(query)}&base=${base}`;

  return fetch(requestUrl)
    .then(response => response.text())
    .then(parseXMLStringToJSON)
    .then(loadRecordIdList);
}

function queryMIDDRindex(melindaId, links) {

  const melindaIdOption = melindaId ? [melindaId] : [];

  const queryIdList = _.concat(melindaIdOption, links);
  if (queryIdList.length === 0) {
    return Promise.resolve([]);
  }

  const query = queryIdList.map(recordId => `MIDRR=${_.padStart(recordId, 9, '0')}`).join(' OR ');

  const requestUrl = `${alephUrl}/X?op=find&request=${encodeURIComponent(query)}&base=${base}`;
  return fetch(requestUrl)
    .then(response => response.text())
    .then(parseXMLStringToJSON)
    .then(_.partial(loadRecordIdList, _, melindaIdOption));
}

function queryXServer(melindaId, links) {
  const melindaIdOption = melindaId ? [melindaId] : [];

  const queryIdList = _.concat(melindaIdOption, links);
  if (queryIdList.length === 0) {
    return Promise.resolve([]);
  }

  return Promise.all(queryIdList.map(isRecordValid)).then((validateResults) => {
    return _.zipWith(queryIdList, validateResults, (id, isValid) => ({id, isValid}))
      .filter(item => item.isValid)
      .map(item => item.id);

  });
}

function isRecordValid(melindaId) {
  const client = createApiClient(melindaClientConfig);
  return new Promise((resolve, reject) => {
    client.read(melindaId).then(({record}) => {
      resolve(!record.containsFieldWithValue('STA', [{code: 'a', value: 'DELETED'}]));
    }).catch(error => {
      reject(error);
    });
  });
}

function loadRecordIdList(setResponse, defaultValue = []) {

  const error = _.head(_.get(setResponse, 'find.error'));
  if (error !== undefined) {
    if (_.head(setResponse.find.error) === ALEPH_ERROR_EMPTY_SET) {
      return defaultValue;
    } else {
      throw new Error(error);
    }
  }

  const {set_number, no_entries} = setResponse.find;
  const presentRequestUrl = `${alephUrl}/X?op=present&set_number=${set_number}&set_entry=1-${no_entries}`;

  return fetch(presentRequestUrl)
    .then(response => response.text())
    .then(parseXMLStringToJSON)
    .then(json => selectRecordIdList(json));
}

function validateResult(resolvedRecordIdList) {
  const numberOfRecords = resolvedRecordIdList.length;

  if (numberOfRecords > 1) {
    throw new Error(`Resolved into multiple records: ${resolvedRecordIdList.join(', ')}`);
  }
  if (numberOfRecords === 0) {
    throw new Error('Resolved into 0 records.');
  }
  return resolvedRecordIdList;
}

function selectRecordIdList(presentResponse) {
  return presentResponse.present.record.map(record => _.head(record.doc_number));
}
