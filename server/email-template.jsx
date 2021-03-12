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

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

export class ReportEmail extends React.Component {

  static propTypes = {
    taskResults: PropTypes.array.isRequired,
    jobId: PropTypes.string.isRequired
  };

  renderRow(taskResult, key) {

    const {lowTag} = taskResult;
    const recordId = _.get(taskResult, 'recordId', 'ID-NOT-FOUND');
    const localId = _.get(taskResult.recordIdHints, 'localId', '');

    const meta = {lowTag, recordId, localId};

    if (taskResult.taskFailed) {
      return this.renderFailedTask(taskResult, meta, key);
    } else {
      return this.renderCompletedTask(taskResult, meta, key);
    }
  }

  renderFailedTask(taskResult, meta, key) {
    const {lowTag, recordId, localId} = meta;
    const status = 'VIRHE';

    return (
      <tr key={key} style={{color: 'red'}}>
        <td>{recordId}</td>
        <td>{localId}</td>
        <td>{lowTag}</td>
        <td>{status}</td>
        <td>{taskResult.failureReason}</td>
      </tr>
    );
  }

  renderCompletedTask(taskResult, meta, key) {
    const {lowTag, recordId, localId} = meta;

    const report = _.get(taskResult, 'report', []).join(', ');
    const {status} = taskResult.updateResponse;
    const message = status === 'UPDATED' || status === '200' ? 'OK' : '';
    return (
      <tr key={key}>
        <td>{recordId}</td>
        <td>{localId}</td>
        <td>{lowTag}</td>
        <td>{status}</td>
        <td>{message}</td>
        <td>{report}</td>
      </tr>
    );

  }

  render() {
    const rows = this.props.taskResults || [];
    const renderRow = this.renderRow.bind(this);

    const columnStyle = {
      paddingRight: '35px'
    };

    return (
      <div>
        <p>Melindan poistot-käyttöliittymästä lähettämäsi tietuelistaus on käsitelty. Alta näet tulokset tietuekohtaisesti.</p>
        <p>Tähän viestiin ei voi vastata. Tarvittaessa ota yhteyttä Melinda-tukeen (melinda-posti@helsinki.fi)
      ja liitä viestiisi poistoajon id: job {this.props.jobId}</p>

        <table cellSpacing="0" cellPadding="0">
          <thead>
            <tr style={{textAlign: 'left'}}>
              <th style={columnStyle}>Melinda-ID</th>
              <th style={columnStyle}>paikalliskannan ID</th>
              <th style={columnStyle}>tietokantatunnus</th>
              <th style={columnStyle}>tila</th>
              <th style={columnStyle}>viesti</th>
              <th style={columnStyle}>raportti</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(renderRow)}
          </tbody>
        </table>
      </div>
    );
  }
}
