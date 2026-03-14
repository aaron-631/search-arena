// Manhattan Distance — admissible & consistent  h(n) = sum of tile distances
export function manhattanDistance(state) {
  let dist = 0;
  for (let i = 0; i < 9; i++) {
    if (state[i] === 0) continue;
    const g = state[i] - 1;
    dist += Math.abs(Math.floor(i / 3) - Math.floor(g / 3))
          + Math.abs((i % 3) - (g % 3));
  }
  return dist;
}
