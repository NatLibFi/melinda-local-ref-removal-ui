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

import '../../styles/components/example-cards.scss';

export class ExampleCardCheckboxes extends React.Component {

  render() {
    return (
      <div className="card info-card">
        <div className="card-content">
          <span className="card-title">Tietokantatunnusten poiston asetukset</span>
          <span className="card-sub-title">Haluan poistojen replikoituvan paikalliskantaan:</span>
          <p>SID-kenttiä ei poisteta Melindan tietueista silloin, kun poistot replikoidaan myös paikalliskantaan. Huomaa, että poisto paikalliskannasta ei onnistu, jos paikalliskannan tietueeseen on linkattuna esim. varasto- tai tilaustietoja. Poistojen replikoiminen paikalliskantaan voi hidastaa muiden tietueiden siirtymistä Melindasta kaikkiin paikalliskantoihin.</p>
          <br></br>
          <span className="card-sub-title">Poista koko tietue Melindasta, jos siihen ei jää yhteen tietokantatunnusta:</span>
          <p className="no-margin-top">Poista Melindasta vain turhat tietueet (esim. virhetietueet, tuplat, tai kokonaan poistetut opetusmonisteet), älä sellaisia, joista voi olla vielä iloa muille.</p>
        </div>
      </div>
    );
  }
}
