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
/* global $, Materialize */
import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

export class LowTagSelectField extends React.Component {

  static propTypes = {
    availableLowTags: PropTypes.array.isRequired,
    onSelectLowTag: PropTypes.func.isRequired
  }

  componentDidMount() {

    if (this.props.availableLowTags.length > 1) {

      const availableLowTags = this.props.availableLowTags.reduce((acc, r) => _.set(acc,r,null), {});

      $(this._input).autocomplete({
        data: availableLowTags
      });

      $(this._input)
        .closest('.input-field')
        .find('.autocomplete-content')
        .on('click', 'li', () => {
          this.onSelectLowTag(this._input.value);
        });

      $(this._input).on('keypress', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this.onSelectLowTag(this._input.value);
          return false;
        }
      });

    } else {
      Materialize.updateTextFields();
      this.onSelectLowTag(_.head(this.props.availableLowTags));
    }

  }

  onSelectLowTag(selectedLowTag) {
    if (selectedLowTag == '') {
      this.props.onSelectLowTag(undefined);
    }
    if (this.props.availableLowTags.some((lowTag) => lowTag === selectedLowTag)) {
      this.props.onSelectLowTag(selectedLowTag);
    }
  }

  render() {
    if (this.props.availableLowTags.length === 1) {
      const fixedLowTag = this.props.availableLowTags[0];
      return (
        <div className="input-field low-tag">
          <label htmlFor="autocomplete-input-fixed">Tietokantatunnus</label>
          <input type="text" id="autocomplete-input-fixed" className="autocomplete low-tag-selector" value={fixedLowTag} disabled ref={(c) => this._input = c} />
        </div>
      );
    } else {
      return (
        <div className="input-field low-tag">
          <label htmlFor="autocomplete-input">Poistettava tietokantatunnus</label>
          <input type="text" id="autocomplete-input" className="autocomplete low-tag-selector" ref={(c) => this._input = c} onChange={(e) => this.onSelectLowTag(e.target.value)} />
        </div>
      );
    }

  }
}


