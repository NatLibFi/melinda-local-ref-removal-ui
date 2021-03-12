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
import '../../styles/components/navbar.scss';
import melindaLogo from '../../images/Melinda-logo-white.png';

export class NavBar extends React.Component {

  static propTypes = {
    onLogout: PropTypes.func.isRequired,
    appTitle: PropTypes.string.isRequired,
    username: PropTypes.string
  };

  componentDidMount() {

    window.$('.nav-dropdown').dropdown({
      inDuration: 300,
      outDuration: 300,
      constrain_width: false,
      hover: false,
      gutter: 0,
      belowOrigin: true,
      alignment: 'right'
    });
  }

  render() {
    const {username, appTitle} = this.props;

    return (
      <div className="navbar">
        <nav>
          <div className="nav-wrapper">
            <img
              className="mt-logo left"
              src={melindaLogo}
            />
            <ul id="nav" className="left">
              <li className="heading">{appTitle}</li>
            </ul>
            <ul id="nav" className="right">
              <li><a href="https://www.kiwi.fi/display/melinda/Tietokantatunnusten+massapoisto+Melindasta" target="_blank" rel="noopener noreferrer">
                <i className="material-icons">help_outline</i>
              </a></li>
              <li><a className="nav-dropdown" href="#" data-activates="mainmenu" ref={(c) => this._dropdown = c} onClick={this.preventDefault}>
                <i className="material-icons right">account_circle</i></a></li>
            </ul>
          </div>
        </nav>

        <ul id='mainmenu' className='dropdown-content'>
          <li className="user-name-menu-item">{username ? username : ''}</li>
          <li className="divider" />
          <li><a href="#" onClick={this.props.onLogout}>Kirjaudu ulos</a></li>
        </ul>
      </div>
    );
  }
}
