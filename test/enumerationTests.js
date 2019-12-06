'use strict';

const expect = require('chai').expect;
const enumeration = require('../lib/designEnumeration');
const uuidv4 = require('uuidv4');

const ATOM = 'atom';

function generateAtom(text) {
  return {id: uuidv4(), text: text, type: ATOM, edges: []};
}

module.exports = function() {
  describe('Design enumeration', function() {
    it('Enumerate designs for one atom', function() {
      const categories = {'a': {'ids': ['a'], 'role': 'a'}};
      const paths = [[generateAtom('a')]];
      const designs = enumeration.enumerateDesigns(paths, categories, 1);
      expect(JSON.stringify(designs)).to.contain('a');
    });

    it('Handle defined but empty category', function() {
      const categories = {'a': {'ids': [], 'role': 'a'}};
      const paths = [[generateAtom('a')]];
      const designs = enumeration.enumerateDesigns(paths, categories, 1);
      expect(JSON.stringify(designs)).to.equal('[]');
    });

    it('Handle empty categories', function() {
      const categories = {};
      const paths = [[generateAtom('a')]];
      expect(() => enumeration.enumerateDesigns(paths, categories, 1)).to.throw('a is not defined in categories');
    });

    it('Handle undefined atom', function() {
      const categories = {'b': {'ids': ['b'], 'role': 'b'}};
      const paths = [[generateAtom('a')]];
      expect(() => enumeration.enumerateDesigns(paths, categories, 1)).to.throw('a is not defined in categories');
    });

    it('Enumerate all duplicates in category', function() {
      const categories = {'a': {'ids': ['a1', 'a2'], 'role': 'a'}};
      const path = [generateAtom('a')];
      const paths = [path, path];
      const designs = enumeration.enumerateDesigns(paths, categories, 4);
      expect(JSON.stringify(designs)).to.equal(JSON.stringify(categories['a']['ids']));
    });

    // it('Multi-level graphs', function() {
    //   const collection = {'a': ['a1', 'a2'], 'b': ['b1']};
    //   const path = [generateRoot(), generateAtom('a')];
    //   const paths = [path, path];
    //   const designs = enumeration(paths, collection, 4);
    //   // TODO finish
    // });

    describe ('Number of designs chosen', function() {
      it('Select 1 of 2 designs', function () {
        const categories = {'a': {'ids': ['a1', 'a2'], 'role': 'a'}};
        const paths = [[generateAtom('a')]];
        const designs = enumeration.enumerateDesigns(paths, categories, 1);
        expect(designs.length).to.equal(1);
      });

      it('Select 0 designs', function () {
        const categories = {'a': {'ids': ['a1', 'a2'], 'role': 'a'}};
        const paths = [[generateAtom('a')]];
        const designs = enumeration.enumerateDesigns(paths, categories, 0);
        expect(designs.length).to.equal(0);
      });
    });
  });

  describe('Cartesian product tests', function() {
    it('Empty setA', function() {
      let setA = [];
      let setB = ['a', 'b'];
      expect(enumeration.getCartesianProduct(setA, setB)).to.equal(setB);
    });
    it('Empty setB', function() {
      let setA = ['a', 'b'];
      let setB = [];
      expect(enumeration.getCartesianProduct(setA, setB)).to.equal(setA);
    });
    it('Product test', function() {
      let setA = ['a', 'b'];
      let setB = ['c', 'd'];
      let result = enumeration.getCartesianProduct(setA, setB);
      expect(result).to.contain('a,c');
      expect(result).to.contain('a,d');
      expect(result).to.contain('b,c');
      expect(result).to.contain('b,d');
    })
  })

};
