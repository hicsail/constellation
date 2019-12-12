const AND = 'and';
const MERGE = 'merge';
const EPSILON = 'epsilon';  // Denotes an intermediary node
const ATOM = 'atom';  // Denotes a GOLDBAR atom
const ACCEPT = 'accept';    // Denotes an end node/a global leaf
const ROOT = 'root';  // Denotes the unique root node


/**
 * Combines graphs sequentially with specified method
 * @param combineMethod String specifying which method of AND or MERGE
 * @param stateGraphObj Object of stateGraphs to be combined
 * @param categories Object of each graph's categories
 * @param tolerance Tolerance level of combined method (0-2)
 * @returns Object of combined graph, its categories, and the new paths
 */
function combineGraphs(combineMethod, stateGraphObj, categories, tolerance) {

  let combined;
  // call the correct handler method on the stateGraphs
  if (combineMethod === AND) {
    combined = linearCall(handleAnd, stateGraphObj, categories, tolerance);

  } else if (combineMethod === MERGE) {
    combined = linearCall(handleMerge, stateGraphObj, categories, tolerance);

  } else {
    throw new Error('Invalid combine method');
  }

  //if the graph is empty at the end (and/merge was unsuccessful) return an empty graph
  if (JSON.stringify(combined.graph ) === JSON.stringify({})) {
    return {graph: {}, categories: {}, paths: []};
  }

  return {graph: combined.graph, categories: combined.categories};
}

/**
 * Calls whichever handler function on the graphs sequentially
 * @param handleFunc Function: the function to call on each item in the object
 * @param graphObj Object: the stateGraphs of all the submitted designs
 * @param categories Object: original list of categories per stateGraph
 * @param tolerance Tolerance level of combined method (0-2)
 * @return {{categories: Object, graph: Object}}
 */
function linearCall(handleFunc, graphObj, categories, tolerance) {
  // do one iteration before the loop
  let firstIter = handleFunc(graphObj[0], graphObj[1], categories[0], categories[1], tolerance);
  let finalGraph = firstIter.graph;
  let finalCategories = firstIter.categories;
  // all subsequent and/merges must happen in relation to the first and/merge
  for (let i = 2; i < Object.keys(graphObj).length; i++) {
    finalGraph = handleFunc(finalGraph, graphObj[i], finalCategories, categories[i], tolerance);
  }
  return {graph: finalGraph, categories: finalCategories};
}


/**
 * Called if combine method is AND; and's one pair of graphs
 * @param graph1 Object representing the left side of the and
 * @param graph2 Object representing the right side of the and
 * @param categories1 Object of first graph's categories
 * @param categories2 Object of second graph's categories
 * @param tolerance Tolerance level of combined method (0-2)
 * @returns Object: {categories: combined categories, graph: combined graph}
 */
function handleAnd(graph1, graph2, categories1, categories2, tolerance) {
  // object to hold the categories from the final graph
  let finalCategories = {};
  let newGraph = cartesianNodes(graph1, graph2);
  for (let id in newGraph) {
    let node = newGraph[id];
    // get the ids from the two original graphs
    let id1 = node.id[0];
    let id2 = node.id[1];
    // compare all the edges of the first id to all the ones from the second id
    for (let edge1 of graph1[id1].edges) {
      if (edge1.component !== EPSILON) {
        for (let edge2 of graph2[id2].edges) {
          // if both edges had the same component and neither was an EPSILON, add to the new graph
          if (edge2.component !== EPSILON) {
            let inCommon;
            // compare the categories in according to the correct tolerance level
            if (tolerance == 0) {
              inCommon = compareCategoriesZero(categories1[edge1.text], categories2[edge2.text]);
            } else if (tolerance == 1) {
              inCommon = compareCategoriesOne(categories1[edge1.text], categories2[edge2.text]);
            } else if (tolerance == 2) {
              inCommon = compareCategoriesTwo(categories1[edge1.text], categories2[edge2.text]);
            } else {
              throw new Error('Invalid tolerance level');
            }
            // compare functions will return empty ids and roles if there is no match
            if (inCommon.ids.length !== 0 || inCommon.roles.length !== 0) {
              let newSrc = [edge1.src, edge2.src];
              let newDest = [edge1.dest, edge2.dest];
              // addToFinalCategories also returns what the new text of this edge should be
              let newText = addToFinalCategories(finalCategories, inCommon, edge1.text, edge2.text);
              let newEdge = {
                src: newSrc,
                dest: newDest,
                component: inCommon,
                type: ATOM,
                text: newText
              };
              node.edges.push(newEdge);
            }
          }
        }
      }
    }
  }

  // propagate each graph's blank edges across the new graph
  propagateBlanks(graph1, newGraph, 0, 1);
  propagateBlanks(graph2, newGraph, 1, 0);

  // rename the ids of the new graph so that they have the form id1-id2 (instead of an array of ids)
  newGraph = renameIds(newGraph);

  // remove nodes that do not have any edges coming out of it (except accepts)
  // must be done multiple times to account for epsilon nodes that point to other epsilon nodes
  let updated = JSON.parse(JSON.stringify(newGraph));
  removeEmptyEdgeNodes(newGraph);
  while (JSON.stringify(updated) !== JSON.stringify(newGraph)) {
    removeEmptyEdgeNodes(newGraph);
    updated = JSON.parse(JSON.stringify(newGraph));
  }

  // remove nodes that don't have any edges pointing to them
  removeNonConnectedNodes(newGraph);

  return {graph: newGraph, categories: finalCategories};

}


/**
 * Called if combine method is MERGE; merges pairs of graphs sequentially
 * @param graph1 Object representing the left side of the merge
 * @param graph2 Object representing the right side of the merge
 * @param categories Object of each graph's categories
 * @param finalCategories Object: categories in the final combined graph
 * @returns Object: Merge of both graphs
 */
function handleMerge(graph1, graph2, categories, finalCategories) {
  console.log("handleMerge called");
}

/**
 * Returns a list of node-pairs that make up the
 * cartesian product of the nodes in the two graphs
 * @param graph1 Object: the first graph
 * @param graph2 Object: the second graph
 * @returns Object: graph with nodes labeled as node pairs of original graphs
 */
function cartesianNodes(graph1, graph2) {
  // object to hold new graph
  let nodes = {};
  for (let id1 in graph1) {
    let node1 = graph1[id1];
    for (let id2 in graph2) {
      let node2 = graph2[id2];
      let newID = [id1, id2];
      let type = '';
      let text = '';
      let operator = [];
      // if both nodes are roots, the new node is also a root; if both are accepts, new node is an accept
      if (node1.type === ROOT && node2.type === ROOT) {
        type = ROOT;
      } else if (node1.type === ACCEPT && node2.type === ACCEPT) {
        type = ACCEPT;
      } else {
        type = EPSILON;
      }

      // if both nodes' texts are 'root', the new node's text is also 'root'; if both are 'accept', new node is 'accept'
      if (node1.text === ROOT && node2.text === ROOT) {
        text = ROOT;
      } else if (node1.text === ACCEPT && node2.text === ACCEPT) {
        text = ACCEPT;
      } else {
        text = EPSILON;
      }

      // if the operators on the node are the same, keep them
      if (JSON.stringify(node1.operator) === JSON.stringify(node2.operator)) {
        operator = node1.operator;
      }

      // insert new node into new graph
      let newNode = {
        id: newID,
        text: text,
        type: type,
        edges: [],
        operator: operator
      };
      nodes[newID] = newNode;
    }
  }
  return nodes;
}

/**
 * @param cat1 Array: first list of categories
 * @param cat2 Array: second list of categories
 * @returns {Object} all the ids that are in common between the two categories
 */
function compareCategoriesZero(cat1, cat2) {
  let commonIds = [];
  for (let id1 of cat1.ids) {
    for (let id2 of cat2.ids) {
      if (id1 === id2) {
        commonIds.push(id1);
      }
    }
  }
  if (commonIds.length === 0) {
    return {ids: [], roles: []};
  }

  let inCommon = {
    ids: commonIds,
    roles: [...new Set(cat1.roles.concat(cat2.roles))]
  };
  return inCommon;
}

/**
 * @param cat1 Array: first list of categories
 * @param cat2 Array: second list of categories
 * @returns {Object} all the ids that are in common between the two categories
 */
function compareCategoriesOne(cat1, cat2) {
  if (cat1.ids.length !== 0 && cat2.ids.length !== 0) {
    return compareCategoriesZero(cat1, cat2);
  }

  // find if the part has any roles in common, if none, return empty category
  let commonRoles = [];
  for (let id1 of cat1.roles) {
    for (let id2 of cat2.roles) {
      if (id1 === id2) {
        commonRoles.push(id1);
      }
    }
  }
  if (commonRoles.length === 0) {
    return {ids: [], roles: []};
  }

  // if there are roles in common, return ids from cat with ids and union roles
  let commonIds;
  // take the ids from the one that has ids (if there are no ids then this will return an empty list of ids and there will be no edge)
  if (cat1.ids.length === 0) {
    commonIds = cat2.ids;
  } else {
    commonIds = cat1.ids;
  }
  if (commonIds.length === 0) {
    return {ids: [], roles: []};
  }
  let inCommon = {
    ids: commonIds,
    roles: [...new Set(cat1.roles.concat(cat2.roles))]
  };
  return inCommon;
}

/**
 * @param cat1 Array: first list of categories
 * @param cat2 Array: second list of categories
 * @returns {Object} all the ids that are in common between the two categories
 */
function compareCategoriesTwo(cat1, cat2) {
  if (cat1.ids.length !== 0 && cat2.ids.length !== 0) {
    return compareCategoriesZero(cat1, cat2);

  } else if (cat1.ids.length === 0 && cat2.ids.length === 0) {
    // find if the part has any roles in common, if none, return empty category
    let commonRoles = [];
    for (let id1 of cat1.roles) {
      for (let id2 of cat2.roles) {
        if (id1 === id2) {
          commonRoles.push(id1);
        }
      }
    }
    if (commonRoles.length === 0) {
      return {ids: [], roles: []};
    }
    let inCommon = {
      ids: [],
      roles: [...new Set(cat1.roles.concat(cat2.roles))]
    };
    return inCommon;

  } else {
    return compareCategoriesOne(cat1, cat2);
  }
}


/**
 * Adds the common ids to either a new or existing category in the final categories
 * @param finalCategories
 * @param inCommon
 * @param text1 String: text from first edge
 * @param text2 String: text from second edge
 * @return {string|*} text to use in resulting edge
 */
function addToFinalCategories(finalCategories, inCommon, text1, text2) {
  let ret;
  if (text1 === text2) {
    finalCategories[text1] = inCommon;
    return text1;
  } else {
    // try the edges' text fields combined in both orders to see if it is already in finalCategories
    let orderOne = text1 + '_' + text2;
    let orderTwo = text2 + '_' + text1;
    if (orderOne in finalCategories) {
      finalCategories[orderOne] += inCommon;
      ret = orderOne;
    } else if (orderTwo in finalCategories) {
      finalCategories[orderTwo] += inCommon;
      ret = orderTwo;
    } else { // if not, make a new entry for this edge
      finalCategories[orderOne] = inCommon;
      ret = orderOne;
    }
  }
  return ret;
}


/**
 * Puts all the blank edges from one graph into the combined graph
 * @param oldGraph Object: graph from which to take blank edges
 * @param newGraph Object: graph in which to put blank edges
 * @param idPos int: position oldGraph id in id arrays of newGraph
 * @param notIDPos int: opposite position of idPos
 */
function propagateBlanks(oldGraph, newGraph, idPos, notIDPos) {
  for (let id in oldGraph) {
    let node = oldGraph[id];
    for (let edge of node.edges) {
      if (edge.component === EPSILON) {
        for (let newID in newGraph) {
          let newNode = newGraph[newID];
          if (newNode.id[idPos] === edge.src) {
            // the blanks must go to any node which is half made from the node we are looking at in the old graph
            let newDest = [0, 0];
            newDest[idPos] = edge.dest;
            newDest[notIDPos] = newNode.id[notIDPos];

            // if the node that is the destination of this edge doesn't have an operator, EPSILON, otherwise use the existing text and type
            let newEdge;
            if (newGraph[newDest].operator.length === 0){
              newEdge = {
                src: newNode.id,
                dest: newDest,
                component: EPSILON,
                type: EPSILON,
                text: EPSILON
              };
            } else {
              newEdge = {
                src: newNode.id,
                dest: newDest,
                component: EPSILON,
                type: edge.type,
                text: edge.text
              };
            }
            newNode.edges.push(newEdge);
          }
        }
      }
    }
  }
}

/**
 * Removes all nodes that do not have edges going out from them
 * @param graph
 */
function removeEmptyEdgeNodes(graph) {
  for (let id in graph) {
    let node  = graph[id];
    if (node.edges.length === 0 && node.type !== ACCEPT) {
      delete graph[id];
      removeNodeFromEdges(graph, id);
    }
  }
}


/**
 * Removes nodes that have no edges pointing to them
 * @param graph
 */
function removeNonConnectedNodes(graph) {
  let hasEdge = false;
  for (let id in graph) {
    let compareNode = graph[id];
    if (compareNode.text === ROOT) {
      continue;
    }
    for (let id2 in graph) {
      let node = graph[id2];
      for (let edge of node.edges) {
        if (edge.dest === compareNode.id) {
          hasEdge = true;
          break;
        }
      }
    }
    if (!hasEdge) {
      delete graph[id];
    } else {
      hasEdge = false;
    }
  }
}

/**
 * Removes all edges pointing to a deleted node
 * @param graph
 * @param deleted
 */
function removeNodeFromEdges(graph, deleted) {
  for (let id in graph) {
    let node = graph[id];
    for (let edge of node.edges) {
      if (edge.dest === deleted) {
        let index = node.edges.indexOf(edge);
        node.edges.splice(index, 1);
      }
    }
  }
}

/**
 * Renames the ids in a graph from the form [id1, id2] to the form id1-id2
 * @param graph
 */
function renameIds(graph) {
  let renamedGraph = {};
  for (let id in graph) {
    let node = graph[id];
    let newId = node.id.join('-');
    node.id = newId;

    for (let edge of node.edges) {
      edge.src = newId;
      edge.dest = edge.dest.join('-');
    }
    renamedGraph[newId] = node;
  }
  return renamedGraph;

}

/**
 * Finds the root node's ID in a graph
 * @param graph
 * @return {string}
 */
function findRoot(graph) {
  for (let id in graph) {
    let node = graph[id];
    if (node.text === ROOT) {
      return id;
    }
  }
}

/**
 * Finds the accept nodes' IDs in a graph
 * @param graph
 * @return {Array}
 */
function findAccepts(graph) {
  let accepts = [];
  for (let id in graph) {
    let node = graph[id];
    if (node.type === ACCEPT) {
      accepts.push(id);
    }
  }
  return accepts
}


module.exports = {
  combineGraphs,
  findRoot,
  findAccepts,
  AND,
  MERGE
};
