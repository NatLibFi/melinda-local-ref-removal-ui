import _ from 'lodash';
import xml2js from 'xml2js';
import promisify from 'es6-promisify';
import fetch from 'isomorphic-fetch';
import { readEnvironmentVariable } from 'server/utils';
import MelindaClient from 'melinda-api-client';
import MarcRecord from 'marc-record-js';

const parseXMLStringToJSON = promisify(xml2js.parseString);


const apiVersion = readEnvironmentVariable('MELINDA_API_VERSION', null);
const alephUrl = readEnvironmentVariable('ALEPH_URL');
const base = readEnvironmentVariable('ALEPH_INDEX_BASE', 'fin01');

const ALEPH_ERROR_EMPTY_SET = 'empty set';
const apiPath = apiVersion !== null ? `/${apiVersion}` : '';
const melindaClientConfig = {
  endpoint: `${alephUrl}/API${apiPath}`,
  user: '',
  password: ''
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
