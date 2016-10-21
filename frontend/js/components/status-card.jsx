import React from 'react';
import { Preloader } from './preloader';
import _ from 'lodash';
import classNames from 'classnames';
import { MAX_VISIBLE_ERROR_AMOUNT } from '../constants/general-constants';

import '../../styles/components/status-card';

export class StatusCard extends React.Component {
  static propTypes = {
    onSubmitList: React.PropTypes.func.isRequired,
    validRecordCount: React.PropTypes.number,
    userinfo: React.PropTypes.object,
    submitStatus: React.PropTypes.string.isRequired,
    recordParseErrors: React.PropTypes.array
  }

  onSubmit(event) {
    event.preventDefault();
    if (this.isSubmitEnabled()) {
      this.props.onSubmitList();  
    }
  }

  renderSuccessCardContent() {
    const userEmail = this.props.userinfo.email || '(sähköposti puuttuu)';

    return (
      <div className="card-content">
        <span className="card-title"><i className='material-icons medium'>done_all</i>Tietuelistaus on lähetetty käsiteltäväksi</span>
        <p>Listan {this.props.validRecordCount} tietuetta on lähetetty käsiteltäväksi.</p>
        <p>Saat vielä sähköpostin osoitteeseen <span className="email">{userEmail}</span> kun tietueet on käsitelty.</p>
      </div>
    );
  }

  renderDefaultCardContent() {
    const userEmail = this.props.userinfo.email || '(sähköposti puuttuu)';

    return (

      <div className="card-content">
        <span className="card-title"><i className='material-icons medium'>playlist_add_check</i>Tietuelistaus on valmiina lähettäväksi</span>
        <p>Saat raportin osoitteeseen <span className="email">{userEmail}</span> kun poistot on tehty.</p>

        <p>{recordCountText(this.props.validRecordCount)}</p>
      </div>
     
    );

    function recordCountText(recordCount) {
      switch(recordCount) {
      case 0: return <p>Listauksessa ei ole yhtään tietuetta.</p>;
      case 1: return <p>Olet lähettämässä {recordCount} tietueen käsiteltäväksi.</p>;
      default: return <p>Olet lähettämässä {recordCount} tietuetta käsiteltäväksi.</p>;
      }
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
        
        { this.renderErrorsSummary() }

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
        
        <p>Tietuelistauksen lähetys epäonnistui. Yritä hetken päästä uudelleen tai ota yhteyttä Melinda ylläpitoon.</p>
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

    if (this.props.submitStatus == 'ONGOING') return <Preloader />;  
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
    if (this.props.recordParseErrors.length === 0 && this.props.validRecordCount > 0) {
      return (this.props.submitStatus === 'NOT_SUBMITTED' || this.props.submitStatus === 'FAILED');
    } 
    return false;
  }

  isSubmitVisible() {
    return (this.props.submitStatus === 'NOT_SUBMITTED' || this.props.submitStatus === 'ONGOING'); 
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
          
          { this.renderCardContent() }
           
          { this.renderSubmitButton() }
        
        </div>
      </div>
    );
  }

}
