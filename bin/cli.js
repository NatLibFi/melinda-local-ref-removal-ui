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
*//* eslint no-console:0 */
import {createLogger} from '@natlibfi/melinda-backend-commons';
import {createApiClient} from '@natlibfi/melinda-rest-api-client';
import _ from 'lodash';
import {stdin} from 'process';
import {MarcRecord} from '@natlibfi/marc-record';
import fs from 'fs';
import path from 'path';
import {restApiUrl, restApiUsername, restApiPassword} from './config';

const logger = createLogger();

const clientConfig = {
  restApiUrl,
  restApiUsername,
  restApiPassword
};

const argv = require('yargs').argv;

if (!isNaN(parseInt(argv._[0])) && argv._.length < 2) {
  argv._.unshift('get');
}

const client = createApiClient(clientConfig);

const [command, arg] = argv._;

if (command === 'get') {
  const recordId = arg;

  client.read(recordId).then(record => {
    logger.log('info', record.toString());
  }).catch(error => {
    console.error(error);
  });
}


if (command === 'create') {

  readRecordFromStdin()
    .then(record => client.create(record))
    .then(printResponse)
    .catch(printError);

}

if (command === 'create-family') {
  const recordDirectory = path.resolve(arg);

  readRecordsFromDir(recordDirectory)
    .then(records => {

      return client.create(records.record).then(res => {
        const {id} = res;
        logger.log('info', `Parent saved: ${id}`);

        return Promise.all(records.subrecords.map(record => {
          updateParent(record, id);

          return client.create(record);
        }));


      });
    })
    .then(subrecords => {
      subrecords.forEach(res => {
        logger.log('info', `Subrecord saved: ${res.recordId}`);
      });

    })
    .catch(printError);

}

if (command === 'update') {

  readRecordFromStdin()
    .then(record => {
      const recordId = getRecordId(record);
      client.update(record, recordId);
    })
    .then(printResponse)
    .catch(printError);

}

if (command === 'set') {

  readRecordFromStdin()
    .then(record => {
      const updateRecordChangeMetadata = _.curry(setRecordChangeMetadata)(record);

      const recordId = getRecordId(record);
      return client.read(recordId)
        .then(getRecordChangeMetadata)
        .then(updateRecordChangeMetadata);

    })
    .then(record => {
      const recordId = getRecordId(record);
      client.update(record, recordId);
    })
    .then(printResponse)
    .catch(printError);

}

function updateParent(record, id) {

  record.fields = record.fields.map(field => {
    if (field.tag === '773') {
      field.subfields = field.subfields.map(sub => {
        if (sub.code === 'w') {
          return _.assign({}, sub, {value: `(FI-MELINDA)${id}`});
        }
        return sub;
      });
    }
    return field;
  });

  return record;
}

function getRecordId(record) {
  const [f001] = record.get(/^001$/u);
  return f001.value;
}

function getRecordChangeMetadata(record) {
  const [f005] = record.get(/^005$/u);
  const fCAT = record.get(/^CAT$/u);
  return [f005.value, fCAT];
}

function setRecordChangeMetadata(record, [timestamp, CATFields]) {
  const [f005] = record.get(/^005$/u);
  f005.value = timestamp;
  record.get(/^CAT$/u).forEach(field => record.removeField(field));
  record.fields.concat(CATFields);
  return record;
}

function readRecordFromStdin() {
  return new Promise((resolve, reject) => {

    let inputChunks = '';
    stdin.resume();
    stdin.setEncoding('utf8');

    stdin.on('data', function (chunk) {
      inputChunks += chunk;
    });

    stdin.on('end', function () {
      try {

        const filteredInputChinks = inputChunks.split('\n').filter(_.identity).join('\n');
        const record = MarcRecord.fromString(filteredInputChinks);
        resolve(record);
      } catch (e) {
        reject(e);
      }
    });
  });
}

function readRecordsFromDir(dir) {
  return new Promise((resolve, reject) => {

    const files = fs.readdirSync(dir);
    const subrecordNames = files.filter(n => n.startsWith('sub')).map(n => path.join(dir, n));

    resolve({
      record: bufferToRecord(fs.readFileSync(path.join(dir, 'main.rec'))),
      subrecords: subrecordNames.map((file) => fs.readFileSync(file)).map(bufferToRecord)
    });

  });
}

function bufferToRecord(buffer) {
  return strToRecord(buffer.toString('utf8'));
}

function strToRecord(str) {
  const filteredInputChinks = str.split('\n').filter(_.identity).join('\n');
  const record = MarcRecord.fromString(filteredInputChinks);
  return record;
}

function printResponse(response) {
  logger.log('info', 'Messages:');
  response.messages.forEach(msg => logger.log('info', ` ${msg.code} ${msg.message}`));

  logger.log('info', 'Errors:');
  response.errors.forEach(msg => logger.log('info', ` ${msg.code} ${msg.message}`));

  logger.log('info', 'Triggers:');
  response.triggers.forEach(msg => logger.log('info', ` ${msg.code} ${msg.message}`));

  logger.log('info', 'Warnings:');
  response.warnings.forEach(msg => logger.log('info', ` ${msg.code} ${msg.message}`));
}

function printError(error) {
  logger.log('error', error);
  logger.log('error', 'Errors:');
  _.get(error, 'errors', []).forEach(msg => logger.log('error', ` ${msg.code} ${msg.message}`));

  logger.log('error', 'Triggers:');
  _.get(error, 'triggers', []).forEach(msg => logger.log('error', ` ${msg.code} ${msg.message}`));

  logger.log('error', 'Warnings:');
  _.get(error, 'warnings', []).forEach(msg => logger.log('error', ` ${msg.code} ${msg.message}`));
}
