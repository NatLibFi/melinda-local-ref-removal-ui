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
*/
import React from 'react';
import {connect} from 'react-redux';
import _ from 'lodash';
import '../../styles/main.scss';
import { removeSession } from '../action-creators/session-actions';
import { setRecordIdList, submitJob } from '../action-creators/record-list-form-actions';
import { resetWorkspace } from '../action-creators/ui-actions';
import { NavBar } from './navbar';
import { SigninFormPanelContainer } from './signin-form-panel';
import { JobConfigurationPanelContainer } from './job-configuration-panel';
import { RecordIdInputArea } from './record-id-input-area';
import { StatusCard } from './status-card';
import { validRecordCount, recordParseErrors, editorIsReadOnly, submitEnabled } from '../selectors/record-list-selectors';
import { ExampleCardLocalId } from './example-card-local-id';
import { ExampleCardMelindaId } from './example-card-melinda-id';

export class BaseComponent extends React.Component {

  static propTypes = {
    sessionState: React.PropTypes.string.isRequired,
    removeSession: React.PropTypes.func.isRequired,
    setRecordIdList: React.PropTypes.func.isRequired,
    resetWorkspace: React.PropTypes.func.isRequired,
    submitJob: React.PropTypes.func.isRequired,
    userinfo: React.PropTypes.object,
    validRecordCount: React.PropTypes.number,
    submitStatus: React.PropTypes.string.isRequired,
    submitJobError: React.PropTypes.string,
    recordParseErrors: React.PropTypes.array,
    editorIsReadOnly: React.PropTypes.bool,
    submitEnabled: React.PropTypes.object
  }

  handleLogout() {
    this.props.removeSession();
  }

  renderValidationIndicator() {
    return null;
  }

  renderSignin() {
    if (this.props.sessionState === 'VALIDATION_ONGOING') {
      return this.renderValidationIndicator();
    } else {
      return (<SigninFormPanelContainer title='Tietokantatunnusten poisto'/>);
    }
  }

  renderMainPanel() {

    const firstName = _.head(_.get(this.props.userinfo, 'name', '').split(' '));
  
    return (
      <div>
        <NavBar 
          onLogout={() => this.handleLogout()}
          username={firstName}
          appTitle='Tietokantatunnusten poisto Melindasta'
        />
        <JobConfigurationPanelContainer />

        <div className="row">
          <div className="col s6 l4 offset-l1">
            <RecordIdInputArea 
              submitStatus={this.props.submitStatus}
              recordParseErrors={this.props.recordParseErrors}
              onChange={(list) => this.props.setRecordIdList(list)}
              readOnly={this.props.editorIsReadOnly} />
          </div>

          <div className="col s6 l5">
            <ExampleCardLocalId />
            <ExampleCardMelindaId />

            <StatusCard 
              onSubmitList={() => this.props.submitJob()} 
              validRecordCount={this.props.validRecordCount}
              userinfo={this.props.userinfo}
              submitStatus={this.props.submitStatus}
              submitJobError={this.props.submitJobError}
              submitEnabled={this.props.submitEnabled}
              recordParseErrors={this.props.recordParseErrors}
              onStartNewList={() => this.props.resetWorkspace()}
              />
          </div>
        </div>
      </div>
    );
  }

  render() {
    
    if (this.props.sessionState == 'SIGNIN_OK') {
      return this.renderMainPanel();
    } else if (this.props.sessionState == 'VALIDATION_ONGOING') {
      return this.renderValidationIndicator();
    } else {
      return this.renderSignin();
    }

  }
}

function mapStateToProps(state) {

  return {
    sessionState: state.getIn(['session', 'state']),
    userinfo: state.getIn(['session', 'userinfo']),
    validRecordCount: validRecordCount(state),
    recordParseErrors: recordParseErrors(state),
    submitStatus: state.getIn(['recordListForm', 'submitStatus']),
    submitJobError: state.getIn(['recordListForm', 'submitJobError']),
    editorIsReadOnly: editorIsReadOnly(state),
    submitEnabled: submitEnabled(state)
  };
}

export const BaseComponentContainer = connect(
  mapStateToProps,
  { removeSession, setRecordIdList, submitJob, resetWorkspace }
)(BaseComponent);
