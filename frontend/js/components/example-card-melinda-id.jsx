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

export class ExampleCardMelindaId extends React.Component {
  render() {
    return (
      <div className="card info-card">
        <div className="card-content">
          <span className="card-title">Poistot Melindan tietuetunnisteen perustella</span>
          <p>Tietueita voi listata myös pelkän Melindan tietuetunnisteen perusteella. Melindan tietuetunniste löytyy paikalliskannan tietueen kentästä 035 $a tai 035 $z. Tunnisteessa on mm. Aurora-paikalliskannoissa (FI-MELINDA) -alku ja mm. Koha-paikalliskannoissa FCC-alku. Tunnisteet voi listata joko (FI-MELINDA)-alkuisena seuraavasti:</p>
          <div className="block">
            <span className="legend">MELINDA_ID</span>
            <span>(FI-MELINDA)001173048</span>
            <span>(FI-MELINDA)001167257</span>
          </div>
          <p>tai FCC-alkuisena seuraavasti:</p>
          <div className="block">
            <span className="legend">MELINDA_ID</span>
            <span>FCC001173048</span>
            <span>FCC001167257</span>
          </div>
          <p>Mikäli paikalliskannan tietueessa on 035-kentän osakentissä $a tai $z useampia Melindan tietuetunnisteita, on ne kaikki lisättävä seuraavasti:</p>
          <div className="block">
            <span className="legend">MELINDA_ID</span>
            <span>FCC001173048 FCC001673048</span>
            <span>FCC001167257 (FI-MELINDA)001627832</span>
            <span>(FI-MELINDA)001627832 (FI-MELINDA)001027832</span>
          </div>
        </div>
      </div>
    );
  }
}
