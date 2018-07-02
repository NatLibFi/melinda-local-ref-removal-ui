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
import { renderIntoDocument } from 'react-dom/test-utils';
import {expect} from 'chai';

import { RecordIdInputArea } from './record-id-input-area';

describe('RecordIdInputArea', () => {
  let editorEl;
  let editor;
  let component;
  beforeEach(() => {
    component = renderIntoDocument(
      <RecordIdInputArea />
    );
    editor = component._editor;
    editorEl = editor.getWrapperElement();
  });

  it('contains a CodeMirror editor', () => {
    expect(editor).to.be.an('object');
  });
  
  describe('when editor is set to readOnly', () => {
    
    beforeEach(() => {
      component.UNSAFE_componentWillReceiveProps({readOnly: true});
    });
    
    it('sets the editor into readOnly mode', () => {
      expect(editor.getOption('readOnly')).to.equal(true);
    });
    it('adds CodeMirror-disabled class', () => {
      expect(editorEl.className.split(' ')).to.contain('CodeMirror-disabled');
    });
   
    describe('when editor is enabled afterwards', () => {
      beforeEach(() => {
        component.UNSAFE_componentWillReceiveProps({readOnly: false});
      });
      it('sets the editor into editable mode', () => {
        expect(editor.getOption('readOnly')).to.equal(false);
      });
      it('removes the CodeMirror-disabled class', () => {
        expect(editorEl.className.split(' ')).not.to.contain('CodeMirror-disabled');
      });
      it('clears the editor value', () => {
        expect(editor.getValue()).to.equal('');
      });

    });

  });

});