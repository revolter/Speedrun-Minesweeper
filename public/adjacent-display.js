const MIN_DISPLAYED_ADJACENT = 1;

export function displayedAdjacentValue(cell, neighbors, hideFlagged) {
  if (!hideFlagged || !cell.isRevealed || cell.isMine) {
    return cell.adjacent;
  }

  const flaggedNeighbors = neighbors.filter((neighbor) => neighbor?.isFlagged);
  const adjusted = cell.adjacent - flaggedNeighbors.length;

  if (cell.adjacent > 0 && adjusted <= 0) {
    return MIN_DISPLAYED_ADJACENT;
  }

  return Math.max(0, adjusted);
}
