export function countAttacks(board) {
  let attacks = 0;
  const n = board.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (board[i] === board[j] || Math.abs(board[i] - board[j]) === Math.abs(i - j))
        attacks++;
  return attacks;
}

/** Backtracking — systematic DFS with constraint pruning. Complete. */
export function nqBacktrack(n) {
  const t0    = performance.now();
  const steps = [];
  const board = Array(n).fill(-1);
  let nodesExplored = 0;

  function isSafe(row, col) {
    for (let r = 0; r < row; r++)
      if (board[r] === col || Math.abs(board[r] - col) === Math.abs(r - row))
        return false;
    return true;
  }

  function solve(row) {
    if (row === n) return true;
    for (let col = 0; col < n; col++) {
      nodesExplored++;
      if (isSafe(row, col)) {
        board[row] = col;
        steps.push({ board: [...board], row, col, action: 'place' });
        if (solve(row + 1)) return true;
        board[row] = -1;
        steps.push({ board: [...board], row, col, action: 'remove' });
      }
      // THE FIX: Increased from 6000 to 60000 to allow 12x12 boards to solve
      if (nodesExplored > 60000) return false; 
    }
    return false;
  }

  const found = solve(0);
  return { board: found ? [...board] : [], steps, nodesExplored, time: performance.now() - t0, found };
}

/** Hill Climbing — local search minimising queen conflicts. Uses random restarts. */
export function nqHillClimb(n) {
  const t0    = performance.now();
  const steps = [];
  let nodesExplored = 0;
  let board = Array.from({ length: n }, () => Math.floor(Math.random() * n));
  steps.push({ board: [...board], attacks: countAttacks(board), action: 'init' });

  for (let restart = 0; restart < 8; restart++) {
    for (let iter = 0; iter < 400; iter++) {
      const cur = countAttacks(board);
      if (cur === 0) break;
      let best = null, bestA = cur;
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          if (board[row] === col) continue;
          const nb = [...board]; nb[row] = col;
          const a = countAttacks(nb); nodesExplored++;
          if (a < bestA) { bestA = a; best = nb; }
        }
      }
      if (!best) break;
      board = best;
      if (steps.length < 500) steps.push({ board: [...board], attacks: bestA, action: 'move' });
    }
    if (countAttacks(board) === 0) break;
    board = Array.from({ length: n }, () => Math.floor(Math.random() * n));
    steps.push({ board: [...board], attacks: countAttacks(board), action: 'restart' });
  }

  const found = countAttacks(board) === 0;
  return { board: found ? board : [], steps, nodesExplored, time: performance.now() - t0, found };
}