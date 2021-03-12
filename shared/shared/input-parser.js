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

import _ from 'lodash';

const MELINDA_ID_PATTERN = /^\(FI-MELINDA\)(\d+)$/;
const LOCAL_ID_PATTERN = /^\d+(\s+FCC\d+)*$/;
const MULTI_ID_PATTERN = /^((\(FI-MELINDA\)\d+|FCC\d+)\s*)*$/;
const MULTI_WITH_LOCAL_ID_PATTERN = /^\d+\s+((\(FI-MELINDA\)\d+|FCC\d+)\s*)*$/;


export function parse(input) {
  const items = input.split('\n').map(trimmer).map(matcher);

  const rowLookup = items.reduce((acc, item, rowIndex) => {
    const key = makeKey(item);
    if (key) {
      return _.set(acc, key, rowIndex);
    } else {
      return acc;
    }
  }, {});

  return items.map((item, rowIndex) => {
    const key = makeKey(item);
    if (rowLookup[key] && rowLookup[key] !== rowIndex) {
      return new Error(`Rivi on identtinen rivin ${rowLookup[key] + 1} kanssa.`);
    }
    return item;
  });
}

function makeKey(item) {
  if (item === undefined) return undefined;

  if (item.localId) {
    return `${item.localId}L${item.links.join('-')}`;
  } else if (item.melindaId) {
    return `M${item.melindaId}`;
  }
  return undefined;
}

function trimmer(str) {
  return str.trim();
}

function matcher(inputLine) {
  if (inputLine.length == 0) {
    return undefined;
  }
  if (MELINDA_ID_PATTERN.test(inputLine)) {
    const [, melindaId] = inputLine.match(MELINDA_ID_PATTERN);
    return {melindaId};
  }
  if (LOCAL_ID_PATTERN.test(inputLine)) {
    const cols = inputLine.split(/\s+/);
    return {
      localId: _.head(cols),
      links: _.tail(cols)
    };
  }
  if (MULTI_ID_PATTERN.test(inputLine)) {
    const cols = inputLine.replace(/\(FI-MELINDA\)/g, 'FCC');
    if (cols.includes(' ')) {
      return {
        localId: '',
        links: cols.split(/\s+/)
      };
    }
    return {
      localId: '',
      links: [cols]
    };
  }

  if (MULTI_WITH_LOCAL_ID_PATTERN.test(inputLine)) {
    const cols = inputLine.replace(/\(FI-MELINDA\)/g, 'FCC');
    const cols2 = cols.split(/\s+/);
    return {
      localId: _.head(cols2),
      links: _.tail(cols2)
    };
  }

  return new Error('Rivi ei ole sallitussa muodossa');
}

export function validate(item) {
  if (item.localId !== undefined) {
    return true;
  }
  if (item.melindaId !== undefined) {
    return true;
  }
  return false;
}
