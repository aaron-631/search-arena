import { runBFS }    from '../algorithms/bfs.js';
import { runDFS }    from '../algorithms/dfs.js';
import { runGreedy } from '../algorithms/greedy.js';
import { runAStar }  from '../algorithms/astar.js';
import { generatePuzzle } from '../utils/puzzleGenerator.js';

// Re-export so App only needs to import from one puzzle file
export { runBFS, runDFS, runGreedy, runAStar, generatePuzzle };

/**
 * Academic race winner:
 *  1. Must have found a solution
 *  2. Shortest path (most optimal)
 *  3. Fewest nodes (most efficient)
 *  4. Fastest time
 */
export function pickRaceWinner(results) {
  return (
    Object.entries(results)
      .filter(([, r]) => r.found)
      .sort(([, a], [, b]) => {
        if (a.path.length   !== b.path.length)   return a.path.length   - b.path.length;
        if (a.nodesExplored !== b.nodesExplored) return a.nodesExplored - b.nodesExplored;
        return a.time - b.time;
      })[0]?.[0] ?? null
  );
}

/** Batch benchmark — average metrics across `count` random puzzles */
export function runBenchmark(selectedAlgos, heuristic, difficulty, count = 40) {
  const totals = {};
  selectedAlgos.forEach((a) => { totals[a] = { nodes: 0, time: 0, depth: 0, solved: 0 }; });

  for (let i = 0; i < count; i++) {
    const puzzle = generatePuzzle(difficulty);
    selectedAlgos.forEach((alg) => {
      const r =
        alg === 'bfs'    ? runBFS(puzzle) :
        alg === 'dfs'    ? runDFS(puzzle) :
        alg === 'greedy' ? runGreedy(puzzle, heuristic) :
                           runAStar(puzzle, heuristic);
      totals[alg].nodes += r.nodesExplored;
      totals[alg].time  += r.time;
      if (r.found) { totals[alg].depth += r.path.length; totals[alg].solved++; }
    });
  }

  const out = {};
  selectedAlgos.forEach((a) => {
    out[a] = {
      avgNodes:  Math.round(totals[a].nodes / count),
      avgTime:   +(totals[a].time  / count).toFixed(2),
      avgDepth:  +(totals[a].depth / (totals[a].solved || 1)).toFixed(1),
      solveRate: Math.round((totals[a].solved / count) * 100),
    };
  });
  return { results: out, count };
}
