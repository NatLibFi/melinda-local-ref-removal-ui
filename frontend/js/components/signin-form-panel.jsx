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
import * as sessionActionCreators from '../action-creators/session-actions';
import {connect} from 'react-redux';
import '../../styles/components/signin-form-panel.scss';

export class SigninFormPanel extends React.Component {

  static propTypes = {
    title: PropTypes.string.isRequired,
    startSession: PropTypes.func.isRequired,
    createSessionErrorMessage: PropTypes.string,
    sessionState: PropTypes.string,
  }
  constructor() {
    super();

    this.state = {
      username: '',
      password: ''
    };
  }

  updateUsername(event) {
    this.setState({username: event.target.value});
  }

  updatePassword(event) {
    this.setState({password: event.target.value});
  }

  executeSignin() {
    const {username, password} = this.state;
    this.props.startSession(username, password);
  }

  renderPreloader() {
    return (
      <div className="progress">
        <div className="indeterminate" />
      </div>
    );
  }

  disableDuringSignin() {
    return this.props.sessionState === 'SIGNIN_ONGOING' ? 'disabled':'';
  }

  render() {
    const title = this.props.title;
    const usernameLabel = 'Käyttäjätunnus';
    const passwordLabel = 'Salasana';
    const signinButtonLabel = 'Kirjaudu';

    const {username, password} = this.state;

    return (

      <div className="card signin-panel valign">
        <div className="card-panel teal lighten-2">
          <h4>{title}</h4>
        </div>
        <div className="card-content">
          <form>
            <div className="col s2 offset-s1 input-field">
              <input id="username" type="text" className="validate" value={username} onChange={this.updateUsername.bind(this)}/>
              <label htmlFor="username">{usernameLabel}</label>
            </div>

            <div className="col s2 offset-s1 input-field">
              <input id="password" type="password" className="validate" value={password} onChange={this.updatePassword.bind(this)}/>
              <label htmlFor="password">{passwordLabel}</label>
            </div>

            <div className="spacer" />
            {this.props.sessionState === 'SIGNIN_ERROR' ? this.props.createSessionErrorMessage : <span>&nbsp;</span>}
            <div className="spacer" />

            <div className="right-align">
              <button className="btn waves-effect waves-light" disabled={this.disableDuringSignin()} type="submit" name="action" onClick={this.executeSignin.bind(this)}>{signinButtonLabel}
                <i className="material-icons right">send</i>
              </button>
            </div>
          </form>
        </div>
        {this.props.sessionState === 'SIGNIN_ONGOING' ? this.renderPreloader():''}
      </div>

    );
  }
}

function mapStateToProps(state) {
  return {
    sessionState: state.getIn(['session' ,'state']),
    createSessionErrorMessage: state.getIn(['session', 'error'])
  };
}

export const SigninFormPanelContainer = connect(
  mapStateToProps,
  sessionActionCreators
)(SigninFormPanel);
