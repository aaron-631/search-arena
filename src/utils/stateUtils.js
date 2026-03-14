export const GOAL_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 0];
export const stateToKey = (s) => s.join(',');
export const goalKey = stateToKey(GOAL_STATE);

export function getNeighbors(state) {
  const blank = state.indexOf(0);
  const row = Math.floor(blank / 3);
  const col = blank % 3;

  const moves = [];

  // These describe BLANK movement
  if (row > 0) moves.push({ dir: 'up', idx: blank - 3 });
  if (row < 2) moves.push({ dir: 'down', idx: blank + 3 });
  if (col > 0) moves.push({ dir: 'left', idx: blank - 1 });
  if (col < 2) moves.push({ dir: 'right', idx: blank + 1 });

  // Convert blank movement → tile movement
  const opposite = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  };

  return moves.map(({ dir, idx }) => {
    const next = [...state];

    // swap blank with tile
    [next[blank], next[idx]] = [next[idx], next[blank]];

    return {
      state: next,
      tile: state[idx],       // tile that moved
      move: opposite[dir]     // tile movement direction
    };
  });
}

export function isSolvable(state) {
  const arr = state.filter((x) => x !== 0);
  let inv = 0;

  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) inv++;
    }
  }

  return inv % 2 === 0;
}