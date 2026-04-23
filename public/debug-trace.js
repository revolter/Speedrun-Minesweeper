export const DEBUG_TRACE_FORMAT = 'speedrun-minesweeper-debug-v3';

function boardCellChar(cell) {
  return cell.isMine ? 'M' : String(cell.adjacent);
}

function boardSnapshot(game) {
  return game.board.map((row) => row.map(boardCellChar).join(''));
}

function cloneSnapshotRows(snapshotRows) {
  if (!Array.isArray(snapshotRows)) {
    return [];
  }
  return snapshotRows.map((row) => String(row));
}

export function createDebugTrace(game, options = {}) {
  const hideFlagged = options.hideFlagged ?? true;
  return {
    format: DEBUG_TRACE_FORMAT,
    appVersion: options.appVersion ?? null,
    hideFlaggedCells: hideFlagged,
    rows: game.rows,
    cols: game.cols,
    mineCount: game.mineCount,
    initialRevealCell: game.initialRevealCell,
    initialBoard: boardSnapshot(game),
    initialSnapshot: cloneSnapshotRows(options.initialSnapshot),
    actions: []
  };
}

export function recordDebugAction(trace, action, row, col, snapshotRows) {
  trace.actions.push({
    index: trace.actions.length + 1,
    action,
    row,
    col,
    snapshot: cloneSnapshotRows(snapshotRows)
  });
}

export function serializeDebugTrace(trace) {
  return JSON.stringify(trace, null, 2);
}
