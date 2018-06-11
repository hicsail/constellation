'use strict';

const expect = require('chai').expect;
const enumeration = require('../lib/designEnumeration');
const uuidv4 = require('uuidv4');

const ATOM = 'atom';

function generateRoot() {
  return {'id': 'root',
    'data': {
      'text': 'root',
      'dataType': 'root',
      'edges': []}};
}

function generateAtom() {
  return {id: uuidv4(), data: {text: 'a', dataType: ATOM, edges: []}};
}

module.exports = function() {
  describe('#design-enumeration', function() {
    it('atom', function() {
      const collection = {'a': ['a']};
      const paths = [[generateRoot(), generateAtom()]];
      const designs = enumeration(paths, collection, 1);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(collection['a']));
    });

    it('empty-part', function() {
      const collection = {'a': []};
      const paths = [[generateRoot(), generateAtom()]];
      const designs = enumeration(paths, collection, 1);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(collection['a']));
    });

    it('missing-part', function() {
      const collection = {'b': []};
      const paths = [[generateRoot(), generateAtom()]];
      const designs = enumeration(paths, collection, 1);
      expect(JSON.stringify(designs)).to.contain('Error');
      expect(designs.length).to.equal(1);
    });

    it('duplicates', function() {
      const collection = {'a': ['a1', 'a2']};
      const path = [generateRoot(), generateAtom()];
      const paths = [path, path];
      const designs = enumeration(paths, collection, 4);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(collection['a']));
    });

    // NUM DESIGNS
    it('select 1 of 2 designs', function() {
      const collection = {'a': ['a1', 'a2']};
      const paths = [[generateRoot(), generateAtom()]];
      const designs = enumeration(paths, collection, 1);
      expect(designs.length).to.equal(1);
    });

    it('select 0 designs', function() {
      const collection = {'a': ['a1', 'a2']};
      const paths = [[generateRoot(), generateAtom()]];
      const designs = enumeration(paths, collection, 0);
      expect(designs.length).to.equal(0);
    });
  });
};
