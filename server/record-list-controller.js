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

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {logger} from 'server/logger';
import {corsOptions, requireBodyParams, userinfoMiddleware} from 'server/utils';
import HttpStatus from 'http-status';
import {connect, startJob} from './record-list-service';
import {requireSession, readSessionMiddleware} from 'server/session-controller';
import cookieParser from 'cookie-parser';
import {validate} from 'shared/input-parser';

// Connect to AMQP host
connect();

export const recordListController = express();
recordListController.use(bodyParser.json({limit: '5mb'}));
recordListController.use(cookieParser());

recordListController.options('/', cors(corsOptions)); // enable pre-flight

recordListController.post('/', cors(corsOptions), readSessionMiddleware, requireSession, requireBodyParams('records', 'lowTag'), userinfoMiddleware, (req, res) => {
  const {records, lowTag} = req.body;
  const {sessionToken} = req.cookies;

  const deleteUnusedRecords = req.body.deleteUnusedRecords || false;
  const replicateRecords = req.body.replicateRecords || false;

  try {
    if (!records.every(validate)) {
      return res.sendStatus(HttpStatus.BAD_REQUEST);
    }
    startJob(records, lowTag, deleteUnusedRecords, replicateRecords, sessionToken, req.userinfo);

  } catch (error) {
    logger.log('error', 'Unable to start job', error);
    return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
  }

  return res.sendStatus(HttpStatus.OK);
});
