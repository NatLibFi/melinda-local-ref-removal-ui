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

const statusPath = __DEV__ ? 'http://localhost:3001/status' : '/status';

export class StatusPage extends React.Component {

  static propTypes = {

  };
  constructor() {
    super();

    this.state = {
      jobs: [],
      error: undefined
    };
  }

  componentDidMount() {

    const fetchOptions = {
      method: 'GET',
      credentials: 'include'
    };

    fetch(statusPath, fetchOptions).then(response => {
      if (response.status !== 200) {
        throw new Error(response.statusText);
      }

      response.json().then(body => {
        this.setState({
          jobs: Object.values(body),
          error: undefined
        });
      });
    }).catch(error => {
      this.setState({
        jobs: [],
        error
      });
    });
  }

  renderSingleJob(job) {

    const {jobId, allTasksCount, incompleteTaskCount} = job;
    const doneTasks = allTasksCount - incompleteTaskCount;
    return (<tr><td>{jobId}</td><td>{doneTasks}/{allTasksCount}</td></tr>);
  }

  renderJobTable() {

    return (
      <table>
        <thead>
          <tr><th>JobId</th><th>status</th></tr>
        </thead>
        <tbody>
          {this.state.jobs.map(this.renderSingleJob)}
        </tbody>
      </table>
    );
  }
  renderError() {
    return (
      <div className="row">
        <div className="col s12 m5">
          <div className="card-panel red lighten-3">
            <span>{this.state.error.message}</span>
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div>
        { this.renderJobTable()}
        { this.state.error ? this.renderError() : null}
      </div>
    );
  }

}
