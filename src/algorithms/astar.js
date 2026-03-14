// A* — informed, complete, optimal  f(n) = g(n) + h(n)
import { stateToKey, goalKey, getNeighbors } from '../utils/stateUtils.js';
import { manhattanDistance } from '../heuristics/manhattan.js';
import { misplacedTiles }    from '../heuristics/misplaced.js';

const NODE_LIMIT = 5000;

export function runAStar(initial, heuristic = 'manhattan') {
  const t0        = performance.now();
  const hFn       = heuristic === 'manhattan' ? manhattanDistance : misplacedTiles;
  const visited   = new Map();
  const rootId    = stateToKey(initial);
  const treeNodes = [{ id: rootId, parentId: null, depth: 0 }];
  const pq        = [{ state: initial, path: [], g: 0, f: hFn(initial), nodeId: rootId, depth: 0 }];
  let nodesExplored = 0;
  const steps = [];

  while (pq.length) {
    pq.sort((a, b) => a.f - b.f);
    const { state, path, g, nodeId, depth } = pq.shift();
    const k = stateToKey(state);
    if (visited.has(k)) continue;
    visited.set(k, g);
    nodesExplored++;
    const h = hFn(state);
    steps.push({ state: [...state], nodesExplored, frontier: pq.length, g, h, f: g + h });
    if (k === goalKey)
      return { path, nodesExplored, time: performance.now() - t0, steps, treeNodes, found: true };

    for (const { state: ns, move, tile } of getNeighbors(state)) {
      const nk = stateToKey(ns);
      if (!visited.has(nk)) {
        const ng = g + 1;
        if (treeNodes.length < 200) treeNodes.push({ id: nk, parentId: nodeId, depth: depth + 1 });
        pq.push({ state: ns, path: [...path, { move, tile }], g: ng, f: ng + hFn(ns), nodeId: nk, depth: depth + 1 });
      }
    }
    if (nodesExplored >= NODE_LIMIT)
      return { path: [], nodesExplored, time: performance.now() - t0, steps, treeNodes, found: false };
  }
  return { path: [], nodesExplored, time: performance.now() - t0, steps, treeNodes, found: false };
}
