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
import {MarcRecord} from '@natlibfi/marc-record';

export const FAKE_RECORD = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '003    aaabbb',
  '100    ‡aTest Author',
  '245 0  ‡aSome content',
  '245 0  ‡aTest Title‡bTest field‡cTest content',
  '300    ‡aSub-A‡5TEST'
].join('\n'), {subfieldValues: false});

export const FAKE_RECORD_WITHOUT_LIBRARY_SPECIFIC_INFO = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '003    aaabbb',
  '100    ‡aTest Author',
  '245 0  ‡aSome content',
  '245 0  ‡aTest Title‡bTest field‡cTest content'
].join('\n'), {subfieldValues: false});


export const FAKE_DELETED_RECORD = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '003    aaabbb',
  '100    ‡aTest Author',
  '245 0  ‡aSome content',
  '245 0  ‡aTest Title‡bTest field‡cTest content',
  'STA    ‡aDELETED'
].join('\n'), {subfieldValues: false});

export const FAKE_RECORD_SID_LOW = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '100    ‡aTest Author',
  'SID    ‡btest‡c111',
  'SID    ‡btest-2‡c114',
  'LOW    ‡aTEST'
].join('\n'), {subfieldValues: false});

export const FAKE_RECORD_2_LOW = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '100    ‡aTest Author',
  'LOW    ‡aTEST',
  'LOW    ‡aTEST-2',
].join('\n'), {subfieldValues: false});


export const FAKE_RECORD_FCC_SID = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '100    ‡aTest Author',
  'SID    ‡btest‡cFCC131',
  'SID    ‡btest-2‡c114'
].join('\n'), {subfieldValues: false});

export const FAKE_RECORD_FOR_CLEANUP = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '100    ‡aTest Author‡9TEST <KEEP>‡9TEST-2 <KEEP>',
  '245    ‡aSome content‡9TEST <DROP>',
  '300    ‡aSub-A‡5TEST',
  '301    ‡aSub-A‡5TEST‡5TEST-2',
  'SID    ‡btest‡cFCC131',
  'SID    ‡btest-2‡c114'
].join('\n'), {subfieldValues: false});

export const FAKE_RECORD_ONLY_LOW_TEST = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '100    ‡aTest Author‡9TEST <KEEP>‡9TEST-2 <KEEP>',
  '245    ‡aSome content‡9TEST <DROP>',
  '300    ‡aSub-A‡5TEST',
  '301    ‡aSub-A‡5TEST‡5TEST-2',
  'SID    ‡btest‡cFCC131',
  'SID    ‡btest-2‡c114',
  'LOW    ‡aTEST'
].join('\n'), {subfieldValues: false});

export const FAKE_RECORD_WITH_LOW_TEST_REMOVED = MarcRecord.fromString([
  'LDR    abcdefghijk',
  '001    28474',
  '100    ‡aTest Author‡9TEST <KEEP>‡9TEST-2 <KEEP>',
  '245    ‡aSome content‡9TEST <DROP>',
  '300    ‡aSub-A‡5TEST',
  '301    ‡aSub-A‡5TEST‡5TEST-2',
  'SID    ‡btest‡cFCC131',
  'SID    ‡btest-2‡c114'
].join('\n'), {subfieldValues: false});
