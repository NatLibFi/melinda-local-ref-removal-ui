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
import {Preloader} from './preloader';
import _ from 'lodash';
import classNames from 'classnames';
import {MAX_VISIBLE_ERROR_AMOUNT} from '../constants/general-constants';

import '../../styles/components/status-card';

export class StatusCard extends React.Component {
  static propTypes = {
    onSubmitList: PropTypes.func.isRequired,
    onStartNewList: PropTypes.func.isRequired,
    validRecordCount: PropTypes.number,
    userinfo: PropTypes.object,
    submitStatus: PropTypes.string.isRequired,
    submitJobError: PropTypes.string,
    recordParseErrors: PropTypes.array,
    submitEnabled: PropTypes.object
  };

  onSubmit(event) {
    event.preventDefault();
    if (this.isSubmitEnabled()) {
      this.props.onSubmitList();
    }
  }

  onStartNewList(event) {
    event.preventDefault();
    this.props.onStartNewList();
  }

  renderSuccessCardContent() {
    const userEmail = this.props.userinfo.email || '(sähköposti puuttuu)';

    return (
      <div className="card-content">
        <span className="card-title"><i className='material-icons medium'>done_all</i>Tietuelistaus on lähetetty käsiteltäväksi</span>
        <p>Listan {this.props.validRecordCount} tietuetta on lähetetty käsiteltäväksi.</p>
        <p>Saat vielä sähköpostin osoitteeseen <span className="email">{userEmail}</span> kun tietueet on käsitelty.</p>
        <p>Lähettämäsi lista on lukittu. Älä lähetä samaa listaa uudelleen. Mikäli haluat lähettää uuden listan, tyhjennä näkymä tästä: <a onClick={(e) => this.onStartNewList(e)} href="#">Aloita uusi lista</a></p>
      </div>
    );
  }

  renderDefaultCardContent() {
    const userEmail = this.props.userinfo.email || '(sähköposti puuttuu)';
    const submitEnabled = this.props.submitEnabled.value;
    const reasonDisabledReason = this.props.submitEnabled.reason;

    return (
      <div className="card-content">
        <span className="card-title"><i className='material-icons medium'>playlist_add_check</i>{titleText(this.props.validRecordCount)}</span>
        <p>Saat raportin osoitteeseen <span className="email">{userEmail}</span> kun poistot on tehty.</p>
        {submitEnabled ? <p>{recordCountText(this.props.validRecordCount)}</p> : <p>{reasonDisabledReason}</p>}
      </div>
    );
    function titleText(recordCount) {
      return recordCount > 0 ? 'Tietuelistaus on valmis lähetettäväksi' : 'Lisää lista poistettavista tietueista';
    }

    function recordCountText(recordCount) {
      if (recordCount === 0) {
        return 'Listauksessa ei ole yhtään tietuetta.';
      }
      if (recordCount === 1) {
        return `Olet lähettämässä ${recordCount} tietueen käsiteltäväksi.`;
      }

      return `Olet lähettämässä ${recordCount} tietuetta käsiteltäväksi.`;
    }
  }

  renderErrorCardContent() {

    return (

      <div className="card-content">
        <span className="card-title">
          <i className='material-icons medium'>error_outline</i>
          Tietuelistauksessa on virheitä
        </span>
        <p>Seuraavat rivit pitää korjata ennenkuin listauksen voi lähettää:</p>
        {
          _.take(this.props.recordParseErrors, MAX_VISIBLE_ERROR_AMOUNT).map(parseError => {
            const row = parseError.row + 1;
            const message = parseError.error.message;
            return (<li key={row}>Rivi {row}: {message}</li>);
          })
        }
        {this.renderErrorsSummary()}
      </div>
    );
  }

  renderSubmitFailureCardContent() {
    return (
      <div className="card-content">
        <span className="card-title">
          <i className='material-icons medium'>error_outline</i>
          Tietuelistauksen lähetys epäonnistui
        </span>
        <p>{this.props.submitJobError.message}</p>
        <p>Jos ongelma toistuu edelleen, ota yhteyttä Melinda-tukeen (melinda-posti@helsinki.fi).</p>
      </div>
    );
  }

  renderErrorsSummary() {
    const errorCount = this.props.recordParseErrors.length;
    if (errorCount > MAX_VISIBLE_ERROR_AMOUNT) {
      return <p>Listauksessa on yhteensä {errorCount} virhettä. Vain {MAX_VISIBLE_ERROR_AMOUNT} ensimmäistä virhettä näytetään.</p>;
    } else {
      return <p>Listauksessa on yhteensä {errorCount} virhettä.</p>;
    }
  }

  renderCardContent() {
    if (this.props.submitStatus == 'ONGOING') return <div className="card-content"><Preloader /></div>;
    if (this.props.submitStatus == 'SUCCESS') return this.renderSuccessCardContent();
    if (this.props.submitStatus == 'FAILED') return this.renderSubmitFailureCardContent();
    if (this.props.recordParseErrors.length === 0) return this.renderDefaultCardContent();
    if (this.props.recordParseErrors.length !== 0) return this.renderErrorCardContent();
  }

  renderSubmitButton() {
    return (
      <div className="card-action right-align">
        <a href="#" onClick={(e) => this.onSubmit(e)}>Lähetä käsiteltäväksi</a>
      </div>
    );
  }

  isSubmitEnabled() {
    return _.get(this.props.submitEnabled, 'value', false);
  }

  isSubmitVisible() {
    return (this.props.submitStatus === 'NOT_SUBMITTED' || this.props.submitStatus === 'ONGOING' || this.props.submitStatus === 'FAILED');
  }

  render() {
    const cardClasses = classNames('card', 'status-card', {
      'status-card-success': this.props.submitStatus == 'SUCCESS',
      'status-card-error': this.props.recordParseErrors.length !== 0,
      'card-action-disabled': !this.isSubmitEnabled(),
      'card-action-visible': this.isSubmitVisible()

    });

    return (
      <div className="status-card-container">
        <div className={cardClasses}>
          {this.renderCardContent()}
          {this.renderSubmitButton()}
        </div>
      </div>
    );
  }
}
