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
*/import _ from 'lodash';
import xml2js from 'xml2js';
import promisify from 'es6-promisify';
import fetch from 'isomorphic-fetch';
import { readEnvironmentVariable } from 'server/utils';
import MelindaClient from '@natlibfi/melinda-api-client';
import MarcRecord from 'marc-record-js';

const parseXMLStringToJSON = promisify(xml2js.parseString);


const apiUrl = readEnvironmentVariable('MELINDA_API', null);
const alephUrl = readEnvironmentVariable('ALEPH_URL');
const base = readEnvironmentVariable('ALEPH_INDEX_BASE', 'fin01');

const ALEPH_ERROR_EMPTY_SET = 'empty set';
const melindaClientConfig = {
  endpoint: apiUrl,
  user: '',
  password: ''
};

const FIND_SET_MAX_ENTRIES=99;

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

export function findComponentIds(melindaId){
  return Promise.all([
    queryMHOSTindex(melindaId)
  ])
  .then(recordIdList => {
    return _.uniq(_.head(recordIdList));
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

function queryMHOSTindex(melindaId) {
 
  if (!melindaId) {
    return Promise.resolve([]);
  }

  const queryIdList = [melindaId]; 

  const query = queryIdList.map(recordId =>`MHOST=${_.padStart(recordId, 9, '0')}`).join(' OR ');

  const requestUrl = `${alephUrl}/X?op=find&request=${encodeURIComponent(query)}&base=${base}`;
  return fetch(requestUrl)
    .then(response => response.text())
    .then(parseXMLStringToJSON)
    .then(loadRecordIdListBigSet);
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
  const client = new MelindaClient(melindaClientConfig);

  return new Promise((resolve) => {
    client.loadRecord(melindaId).then(responseRecord => {
      const record = new MarcRecord(responseRecord);
      resolve(!record.isDeleted());
    }).catch(() => {
      resolve(false);
    }).done();

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

  const { set_number, no_entries } = setResponse.find;
  const presentRequestUrl = `${alephUrl}/X?op=present&set_number=${set_number}&set_entry=1-${no_entries}`;

  return fetch(presentRequestUrl)
    .then(response => response.text())
    .then(parseXMLStringToJSON)
    .then(json => selectRecordIdList(json));
}

function loadRecordIdListBigSet(setResponse, defaultValue = []) {

  const error = _.head(_.get(setResponse, 'find.error'));
  if (error !== undefined) {
    if (_.head(setResponse.find.error) === ALEPH_ERROR_EMPTY_SET) {
      return defaultValue;
    } else {
      throw new Error(error);
    }
  }

  const { set_number, no_entries } = setResponse.find;

  //if (no_entries > 100) {
  //  throw new Error('Set has more than 100 entries, cannot fetch');
  //}
  
  return fetchItems(set_number, no_entries);
}

function fetchItems(set_number, no_entries, allData = [], offset = 1) {
  
  const end = offset + FIND_SET_MAX_ENTRIES;
  const presentRequestUrl = `${alephUrl}/X?op=present&set_number=${set_number}&set_entry=${offset}-${end}`;
  
  return fetch(presentRequestUrl)
    .then(response => {
      if (response.status && response.status != 200) {
        throw new Error(response.status);
      }
      
      return response.text()
        .then(parseXMLStringToJSON)
        .then(jsonBody => {
          const records=_.get(jsonBody, 'present.record', []);
          const recordIds = records.map(record => _.get(record, 'doc_number[0]'));
          
          // TODO: this should check that all expected records are returned

          allData = allData.concat(recordIds);      
          if (end <= no_entries) {
            return fetchItems(set_number, no_entries, allData, end+1);
          }
          else {
            return Promise.resolve(allData);
          }
        });
    });
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
