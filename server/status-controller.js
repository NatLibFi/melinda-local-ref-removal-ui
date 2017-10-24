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
*/import express from 'express';
import cors from 'cors';
import { corsOptions } from 'server/utils';
import { requireSession, readSessionMiddleware } from 'server/session-controller';

export default function StatusController(resultWorker) {
  
  const statusController = express();
  
  statusController.options('/', cors(corsOptions)); // enable pre-flight
  
  statusController.get('/', cors(corsOptions), readSessionMiddleware, requireSession, (req, res) => {
    res.send(resultWorker.getStatusInfo());
  });

  return statusController;
}
