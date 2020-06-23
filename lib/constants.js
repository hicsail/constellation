module.exports = Object.freeze({
  NODE: 'NODE', // Denotes edge representation of graph
  EDGE: 'EDGE', // Denotes node representation of graph
  EPSILON: 'epsilon',  // Denotes an intermediary node
  ATOM: 'atom',  // Denotes a GOLDBAR atom
  ACCEPT: 'accept',    // Denotes an end node/a global leaf
  ROOT: 'root',  // Denotes the unique root node
  OR: 'Or',
  OR_SBOL: 'OrSBOL', // Used when parsing SBOL
  THEN: 'Then',
  ONE_MORE: 'OneOrMore',
  ZERO_MORE: 'ZeroOrMore',
  ZERO_ONE: 'ZeroOrOne',
  OR_MORE: 'OrMore',
  ZERO_SBOL: 'ZeroOrMoreSBOL',
  ZERO_ONE_SBOL: 'ZeroOrOneSBOL',
  AND: 'And',
  AND0: 'And0', // AND0, AND1, and AND2 denote different tolerance levels
  AND1: 'And1',
  AND2: 'And2',
  MERGE: 'Merge',
  INLINE: 'Inline', // atom orientation
  REV_COMP: 'ReverseComp', // atom orientation
  NONE: 'None', // atom orientation
  ONE: 'One',
  TENSOR: 'Tensor',
  TWO: 'Two',

  /* * * * * * */
  /*   SBOL    */
  /* * * * * * */
  CONSTELLATION_GIT: 'https://github.com/hicsail/constellation-js',
  CONSTELLATION_URL: 'http://constellationcad.org',
  VERSION: '1',
  DELIMITER: '/',
  COLLECTION: '_collection',
  TEMPLATE: '_template',
  COMBINATORIAL: '_derivation',
  GENERIC_LOCATION: '_generic_location',
  SEQUENCE_ANNOTATION: 'sequence_annotation',
  SEQUENCE_CONSTRAINT: '_sequence_constraint',
  COMPONENT: '_component',
  VARIABLE: '_variable',
  ORREGION: 'or_unit',
  ORSUBREGION: '_or_subunit',
  CYCLEREGION: 'cyclical_unit',

  ZERO_MORE_URI: 'http://sbols.org/v2#zeroOrMore',
  ONE_URI: 'http://sbols.org/v2#one',
  ONE_MORE_URI: 'http://sbols.org/v2#oneOrMore',
  ZERO_ONE_URI: 'http://sbols.org/v2#zeroOrOne',

  SEQUENCE_CONSTRAINT_URIS: {
    PRECEDE: 'http://sbols.org/v2#precedes',
    SAMEORIENTATION: 'http://sbols.org/v2#sameOrientationAs',
    OPPOSITEORIENTATION: 'http://sbols.org/v2#oppositeOrientationAs',
    DIFFERENT: 'http://sbols.org/v2#differentFrom'
  },
  REV_COMP_URI: 'http://sbols.org/v2#reverseComplement',
  INLINE_URI: 'http://sbols.org/v2#inline',

  //default values if annotation cannot be found in the SBOL
  MAX_CYCLE: 0,
  NUM_DESIGNS: 100,
});
