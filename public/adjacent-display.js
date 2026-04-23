export function displayedAdjacentValue(cell, neighbors, hideFlagged) {
  if (!hideFlagged || !cell.isRevealed || cell.isMine) {
    return cell.adjacent;
  }

  const flaggedNeighbors = neighbors.filter((neighbor) => neighbor?.isFlagged && neighbor?.isMine);
  const adjusted = cell.adjacent - flaggedNeighbors.length;

  return Math.max(0, adjusted);
}
