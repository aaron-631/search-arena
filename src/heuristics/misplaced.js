import { GOAL_STATE } from '../utils/stateUtils.js';

// Misplaced Tiles — admissible but weaker than Manhattan
export function misplacedTiles(state) {
  return state.filter((v, i) => v !== 0 && v !== GOAL_STATE[i]).length;
}
