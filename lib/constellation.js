/*global graph:true designEnumeration:true imparse:true*/
design = require('./designEnumeration');
symbolicEnumeration = require('./symbolicEnumeration');
imparse = require('imparse');
graphGOLDBAR = require('./graphGOLDBAR');
graphDataOnEdges = require('./graphDataOnEdges');
uuidv4 = require('uuidv4');

graphToSBOL = require('./sbol');
edgeSBOL = require('./edgeSBOL');
graphFromSBOL = require('./graphSBOL');
SBOLDocument = require('sboljs');
simplify = require('./simplifyOperators');

const GRAMMAR_DEF = [{'Seq':[{'Then':[['Exp'],'.',['Seq']]},{'Then':[['Exp'],'then',['Seq']]},{'':[['Exp']]}]},{'Exp':[{'Or':[['Term'],'or',['Exp']]},{'And':[['Term'],'and',['Exp']]},{'':[['Term']]}]},{'Term':[{'OneOrMore':['one-or-more',['Term']]},{'ZeroOrMore':['zero-or-more',['Term']]},{'ZeroOrOne':['zero-or-one',['Term']]},{'ZeroOrOneSBOL':['zero-or-one-sbol',['Term']]},{'ZeroOrMoreSBOL':['zero-or-more-sbol',['Term']]},{'':['{',['Seq'],'}']},{'':['(',['Seq'],')']},{'Atom':[{'RegExp':'([A-Za-z0-9]|-|_)+'}]}]}];
const NODE = 'NODE';
const EDGE = 'EDGE';

/* * * * * * */
/*    MAIN   */
/* * * * * * */
/**
 * Runs constellation
 * @param designName Name of combinatorial design
 * @param langText Text with GOLDBAR specification input
 * @param categories Text or object with categories
 * @param numDesigns Maximum number of designs to output
 * @param maxCycles Maximum depth of cycles
 * @param representation Config variable representing which form of graph was requested (NODE vs. EDGE)
 * @param andTolerance Tolerance level to use for all AND operators in design
 * @param mergeTolerance Tolerance level to use for all MERGE operators in design
 * @returns {{stateGraph, designs: *, paths}}
 */
async function goldbar(langText, categories,
                       {
                         designName = 'constellation-design',
                         numDesigns = 20,
                         maxCycles = 0,
                         representation = EDGE,
                         andTolerance = 0,
                         mergeTolerance = 0
                       } = {}) {
  if (!langText) {
    throw new Error('No input received');
  }
  if (numDesigns < 1) {
    throw new Error('Invalid number of designs');
  }
  if (maxCycles < 0 || maxCycles > 10) {
    throw new Error('Invalid cycle depth');
  }
  if (representation !== NODE && representation !== EDGE) {
    throw new Error('Invalid graph representation');
  }
  if (andTolerance < 0 || andTolerance > 2) {
    throw new Error('Invalid tolerance parameter for AND');
  }
  if (mergeTolerance < 0 || mergeTolerance > 2) {
    throw new Error('Invalid tolerance parameter for MERGE');
  }

  let parsed, gra, graSBOL, designs, sbolDoc, sparsed, sparsedSBOL;

  try {
    parsed = parseGoldbar(langText);
  } catch (error) {
    throw new Error('Error parsing design specification')
  }

  try {
    categories = parseCategories(categories);
  } catch (error) {
    throw new Error('Error parsing categories specification')
  }

  if (Object.entries(categories).length === 0 && categories.constructor === Object) {
    throw new Error('No categories specified');
  }

  // simplify the parsed object based on the formalized simplification rules
  sparsed = simplify.simplifyTree(parsed);
  // graph the data on whatever representation is in the config file
  gra = graphGOLDBAR.createGraphFromGOLDBAR(sparsed, maxCycles, representation, categories, andTolerance, mergeTolerance);
  // if we get an empty graph back (invalid design) display a single epsilon node
  if (JSON.stringify(gra.stateGraph) === JSON.stringify({})) {
    let epsGraph = {};
    graphDataOnEdges.createEpsilonNode(epsGraph);
    return {stateGraph: epsGraph, designs: [], sbol: null};
  }
  // if the original design has an AND or MERGE in it, convert to GOLDBAR and back to generate SBOL
  if (representation === NODE) {
    sparsedSBOL = simplify.getSimplifiedSBOL(sparsed);
    graSBOL = graphGOLDBAR.createGraphFromGOLDBAR(sparsedSBOL, maxCycles, NODE, categories, andTolerance, mergeTolerance).stateGraph;
  }
  designs = design.enumerateDesigns(gra.paths, categories, numDesigns);

  try {
    designName = String(designName).replace(/ /g, '_');
    if (representation === NODE) {
      sbolDoc = graphToSBOL(graSBOL, categories, designName, numDesigns, maxCycles);
    } else {
      sbolDoc = edgeSBOL(gra.stateGraph, categories, designName, numDesigns, maxCycles);
    }

  } catch (error) {
    console.log(error);
  }
  if (representation === NODE) {
    return {stateGraph: gra.stateGraph, designs: designs, sbol: sbolDoc};
  } else {
    return {stateGraph: gra.collapsed, designs: designs, sbol: sbolDoc};
  }
}

/**
 * Runs symbolic enumeration component
 * @param designName Name of combinatorial design
 * @param langText Text with GOLDBAR specification input
 * @param categories Text or object with categories
 * @param numDesigns Maximum number of designs to output
 * @param maxCycles Maximum number of cycles in total
 * @returns {{designs: *}}
 */
async function symbolic(langText, categories,
                       {
                         designName = 'constellation-design',
                         numDesigns = 'all', // Must be 'all' or an integer.
                         maxCycles = 4
                       } = {}) {
  if (!langText) {
    throw new Error('No input received');
  }
  if (!isNaN(numDesigns) && numDesigns <= 0) {
    throw new Error('Number of designs must be a positive integer.');
  }
  if (isNaN(numDesigns) && numDesigns != 'all') {
    throw new Error('Number of designs must be an integer or "all".');
  }
  if (isNaN(maxCycles) || maxCycles < 0) {
    throw new Error('Number of allowed cycles must be at least 0.');
  }

  let parsed, designs;

  try {
    parsed = parseGoldbar(langText);
  } catch (error) {
    throw new Error('Error parsing design specification')
  }

  try {
    categories = parseCategories(categories);
  } catch (error) {
    throw new Error('Error parsing categories specification')
  }

  if (Object.entries(categories).length === 0 && categories.constructor === Object) {
    throw new Error('No categories specified');
  }

  designs = symbolicEnumeration.enumerateDesigns(parsed, categories, numDesigns, maxCycles);

  return {designs: designs};
}

async function sbol(sbolDocs, combineMethod, tolerance, representation=EDGE){
  // process each of the sbol files
  let processedSBOL = [];
  for (let sbolDoc of sbolDocs) {
    processedSBOL.push(await loadSBOL(sbolDoc));
  }
  // generate graph from array of SBOL documents
  let gra;
  try {
    gra = graphFromSBOL(processedSBOL,representation, combineMethod, tolerance);
  } catch (error) {
    console.log(error);
    throw new Error('SBOL Parsing error!')
  }

  if (!gra){
    throw new Error('No collections were found in the SBOL');
  }

  let designs = design.enumerateDesigns(gra.paths, gra.categories, gra.numDesigns);
  return {stateGraph: gra.stateGraph, designs: designs, paths: gra.paths}
}


/**
 * Sanitises specification input and parses GOLDBAR
 * @param langText Text with GOLDBAR specification text
 * @returns {object} Parsed object
 */
function parseGoldbar(langText) {
  langText = String(langText).replace('\t', ' ');
  langText = langText.trim();
  return imparse.parse(GRAMMAR_DEF, langText);
}

function parseCategories(categories) {
  if (typeof categories === 'string' || categories instanceof String) {
    categories = String(categories).replace('\t', ' ');
    return JSON.parse(categories);
  } else { // Maybe validate categories here?
    return categories;
  }
}

function loadSBOL(sbolData) {
  return new Promise((resolve) => {
    SBOLDocument.loadRDF(sbolData, (err, sbol) => {
      resolve(sbol);
    });
  });
}

module.exports = {
  goldbar,
  symbolic,
  sbol
};
