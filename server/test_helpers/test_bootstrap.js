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

process.env.ALEPH_URL='test-url';
// Ignoring njsscan because it's not an actual username and this is test data anyway
process.env.ALEPH_USER_LIBRARY='test-lib'; //ignore:node_username
process.env.REST_API_URL='test-rest-url';
process.env.REST_API_USERNAME='test-rest-username'; //ignore: node_username
process.env.REST_API_PASSWORD='test-rest-password'; //ignore: node_password
process.env.DUPLICATE_DB_URL='test-duplicate-db-url';
process.env.AMQP_HOST='test-amqp-host';
process.env.SMTP_CONNECTION_URL='smtp://test:test@localhost:2525';
