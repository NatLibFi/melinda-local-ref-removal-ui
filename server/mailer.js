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

import nodemailer from 'nodemailer';
import {readEnvironmentVariable} from 'server/utils';
import _ from 'lodash';

const SMTP_CONNECTION_URL = readEnvironmentVariable('SMTP_CONNECTION_URL');
const SMTP_FROM_EMAIL = readEnvironmentVariable('SMTP_FROM_EMAIL', 'noreply@melinda.kansalliskirjasto.fi');
const SMTP_CC_ADDRESS = readEnvironmentVariable('SMTP_CC_ADDRESS', '');
const transporter = nodemailer.createTransport(SMTP_CONNECTION_URL);

export function mail(mailOptions) {
  const opts = _.assign({}, mailOptions, {
    from: SMTP_FROM_EMAIL,
    cc: SMTP_CC_ADDRESS
  });

  return new Promise((resolve, reject) => {
    transporter.sendMail(opts, (err, info) => {
      if (err) {
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
}
