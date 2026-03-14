// Greedy Best-First — informed, not optimal, minimises h(n) only
import { stateToKey, goalKey, getNeighbors } from '../utils/stateUtils.js';
import { manhattanDistance } from '../heuristics/manhattan.js';
import { misplacedTiles }    from '../heuristics/misplaced.js';

const NODE_LIMIT = 5000;

export function runGreedy(initial, heuristic = 'manhattan') {
  const t0        = performance.now();
  const hFn       = heuristic === 'manhattan' ? manhattanDistance : misplacedTiles;
  const visited   = new Set([stateToKey(initial)]);
  const rootId    = stateToKey(initial);
  const treeNodes = [{ id: rootId, parentId: null, depth: 0 }];
  const pq        = [{ state: initial, path: [], h: hFn(initial), nodeId: rootId, depth: 0 }];
  let nodesExplored = 0;
  const steps = [];

  while (pq.length) {
    pq.sort((a, b) => a.h - b.h);
    const { state, path, nodeId, depth } = pq.shift();
    nodesExplored++;
    const h = hFn(state);
    steps.push({ state: [...state], nodesExplored, frontier: pq.length, h });
    if (stateToKey(state) === goalKey)
      return { path, nodesExplored, time: performance.now() - t0, steps, treeNodes, found: true };

    for (const { state: ns, move, tile } of getNeighbors(state)) {
      const k = stateToKey(ns);
      if (!visited.has(k)) {
        visited.add(k);
        if (treeNodes.length < 200) treeNodes.push({ id: k, parentId: nodeId, depth: depth + 1 });
        pq.push({ state: ns, path: [...path, { move, tile }], h: hFn(ns), nodeId: k, depth: depth + 1 });
      }
    }
    if (nodesExplored >= NODE_LIMIT)
      return { path: [], nodesExplored, time: performance.now() - t0, steps, treeNodes, found: false };
  }
  return { path: [], nodesExplored, time: performance.now() - t0, steps, treeNodes, found: false };
}
