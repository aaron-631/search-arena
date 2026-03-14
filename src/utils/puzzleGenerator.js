import { GOAL_STATE, getNeighbors, stateToKey, isSolvable } from './stateUtils.js';

const SHUFFLES = { easy: 5, medium: 15, hard: 30 };

export function generatePuzzle(difficulty = 'medium') {
  const shuffles = SHUFFLES[difficulty] ?? 15;
  let state   = [...GOAL_STATE];
  let prevKey = null;
  for (let i = 0; i < shuffles; i++) {
    const neighbors = getNeighbors(state).filter(
      (n) => stateToKey(n.state) !== prevKey
    );
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    prevKey = stateToKey(state);
    state   = pick.state;
  }
  if (!isSolvable(state)) [state[0], state[1]] = [state[1], state[0]];
  return state;
}
