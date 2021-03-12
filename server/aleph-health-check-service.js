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

import fetch from 'isomorphic-fetch';
import {readEnvironmentVariable} from 'server/utils';

const apiUrl = readEnvironmentVariable('MELINDA_API', null);
const alephUrl = readEnvironmentVariable('ALEPH_URL');
const XServerUrl = `${alephUrl}/X`;

export function checkAlephHealth() {

  return Promise.all([fetch(apiUrl), fetch(XServerUrl)]).then(([apiResponse, XServerResponse]) => {

    if (apiResponse.status !== 200) {
      throw new Error(`Melinda api failed. status=${apiResponse.status}`);
    }
    if (XServerResponse.status !== 200) {
      throw new Error(`X-Server failed. status=${XServerResponse.status}`);
    }

  });
}
