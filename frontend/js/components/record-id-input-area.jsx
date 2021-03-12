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
import CodeMirror from 'codemirror';
import { parse } from 'shared/input-parser';
import _ from 'lodash';
import { MAX_VISIBLE_ERROR_AMOUNT } from '../constants/general-constants';
import { isFileApiSupported } from '../utils';

import '../../styles/components/record-id-input-area';

export class RecordIdInputArea extends React.Component {

  static propTypes = {
    onChange: PropTypes.func.isRequired,
    recordParseErrors: PropTypes.array,
    readOnly: PropTypes.bool,
    submitStatus: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);

    const readOnly = _.get(props, 'readOnly', false);

    this.state = {
      recordParseErrors: [],
      readOnly
    };
  }

  componentDidMount() {
    this._editor = CodeMirror.fromTextArea(this._textarea, {
      lineNumbers: true,
      gutters: ['CodeMirror-gutter-error']
    });

    const updater = _.debounce(this.handleUpdate.bind(this), 150);
    this._editor.on('change', updater);

  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const readOnly = _.get(nextProps, 'readOnly', false);
    const { recordParseErrors, submitStatus } = nextProps;

    this.updateErrorMarkers(recordParseErrors || []);

    if (this.state.readOnly !== readOnly) {
      this.setReadOnly(readOnly || false);
    }
    if (this.state.submitStatus === 'SUCCESS' && submitStatus === 'NOT_SUBMITTED') {
      this.clearEditor();
    }
    this.setState({ readOnly, submitStatus });
  }

  shouldComponentUpdate() {
    return false;
  }

  handleUpdate() {
    const value = this._editor.getValue();
    const list = parse(value);
    this.props.onChange(list);
  }

  updateErrorMarkers(nextParseErrors) {
    const visibleErrorMarkers = _.take(nextParseErrors, MAX_VISIBLE_ERROR_AMOUNT);
    const nextErrorRows = nextParseErrors.map(err => err.row).reduce((acc, row) => _.set(acc, row, true), {});

    this.state.recordParseErrors.forEach(err => {
      if (!nextErrorRows[err.row]) {
        const lineHandle = this._editor.getLineHandle(err.row);
        if (lineHandle) this._editor.setGutterMarker(lineHandle, 'CodeMirror-gutter-error', null);
      }
    });

    visibleErrorMarkers.forEach(visibleParseError => {
      const lineHandle = this._editor.getLineHandle(visibleParseError.row);
      const markers = _.get(lineHandle, 'gutterMarkers', {}) || {};
      const hasErrorMarker = Object.keys(markers).some(marker => marker == 'CodeMirror-gutter-error');

      if (!hasErrorMarker) {
        const marker = this.makeMarker(visibleParseError.error.message);
        if (lineHandle) this._editor.setGutterMarker(lineHandle, 'CodeMirror-gutter-error', marker);
      }
    });

    this.setState({
      recordParseErrors: visibleErrorMarkers
    });
  }

  setReadOnly(readOnlyFlag) {
    this._editor.setOption('readOnly', readOnlyFlag);
    if (readOnlyFlag) {
      window.$(this._editor.getWrapperElement()).addClass('CodeMirror-disabled');
    } else {
      window.$(this._editor.getWrapperElement()).removeClass('CodeMirror-disabled');
    }
  }

  clearEditor() {
    this._editor.setValue('');
  }

  makeMarker(msg) {
    var marker = window.$(`<i class="material-icons gutter-tooltip" title="${msg}">error_outline</i>`).get(0);
    marker.style.color = '#822';
    return marker;
  }

  handleFileSelect(event) {
    const fileList = event.target.files;

    if (fileList.length > 0) {
      const file = fileList[0];
      const reader = new FileReader();

      this.clearEditor();
      reader.addEventListener('load', (e) => {
        const fileContents = e.target.result;
        this._editor.setValue(fileContents);
      });

      reader.readAsText(file);
    }
  }

  renderFileUploadInput() {
    if (!isFileApiSupported()) {
      return null;
    }

    return (
      <div className="file-field input-field">
        <div className="btn">
          <span>TIEDOSTO</span>
          <input type="file" ref={(c) => this._fileInput = c} onChange={(e) => this.handleFileSelect(e)}/>
        </div>
        <div className="file-path-wrapper">
          <input className="file-path validate" type="text" />
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="record-id-input-controls">
        { this.renderFileUploadInput() }
        <div className="record-id-input-container">
          <textarea className="record-id-input" ref={(c) => this._textarea = c} />
        </div>
      </div>
    );
  }
}
