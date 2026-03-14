// BFS — uninformed, complete, optimal  O(b^d)
import { stateToKey, goalKey, getNeighbors } from '../utils/stateUtils.js';

const NODE_LIMIT = 5000;

export function runBFS(initial) {
  const t0        = performance.now();
  const visited   = new Set([stateToKey(initial)]);
  const rootId    = stateToKey(initial);
  const treeNodes = [{ id: rootId, parentId: null, depth: 0 }];
  const queue     = [{ state: initial, path: [], nodeId: rootId, depth: 0 }];
  let nodesExplored = 0;
  const steps = [];

  while (queue.length) {
    const { state, path, nodeId, depth } = queue.shift();
    nodesExplored++;
    steps.push({ state: [...state], nodesExplored, frontier: queue.length });
    if (stateToKey(state) === goalKey)
      return { path, nodesExplored, time: performance.now() - t0, steps, treeNodes, found: true };

    for (const { state: ns, move, tile } of getNeighbors(state)) {
      const k = stateToKey(ns);
      if (!visited.has(k)) {
        visited.add(k);
        if (treeNodes.length < 200) treeNodes.push({ id: k, parentId: nodeId, depth: depth + 1 });
        queue.push({ state: ns, path: [...path, { move, tile }], nodeId: k, depth: depth + 1 });
      }
    }
    if (nodesExplored >= NODE_LIMIT)
      return { path: [], nodesExplored, time: performance.now() - t0, steps, treeNodes, found: false };
  }
  return { path: [], nodesExplored, time: performance.now() - t0, steps, treeNodes, found: false };
}
