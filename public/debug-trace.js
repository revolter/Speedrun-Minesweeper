export const DEBUG_TRACE_FORMAT = 'speedrun-minesweeper-debug-v1';

function initialBoard(game) {
  return game.board.map((row) => row.map((cell) => (cell.isMine ? 'M' : cell.adjacent)));
}

function initialRevealedCells(game) {
  const revealed = [];
  for (let row = 0; row < game.rows; row += 1) {
    for (let col = 0; col < game.cols; col += 1) {
      if (game.board[row][col].isRevealed) {
        revealed.push([row, col]);
      }
    }
  }
  return revealed;
}

export function createDebugTrace(game) {
  return {
    format: DEBUG_TRACE_FORMAT,
    rows: game.rows,
    cols: game.cols,
    mineCount: game.mineCount,
    initialRevealCell: game.initialRevealCell,
    initialBoard: initialBoard(game),
    initialRevealedCells: initialRevealedCells(game),
    actions: []
  };
}

export function recordDebugAction(trace, action, row, col) {
  trace.actions.push({
    index: trace.actions.length + 1,
    action,
    row,
    col
  });
}

export function serializeDebugTrace(trace) {
  return JSON.stringify(trace, null, 2);
}

export function isDebugTrace(value) {
  return (
    value &&
    value.format === DEBUG_TRACE_FORMAT &&
    Number.isInteger(value.rows) &&
    Number.isInteger(value.cols) &&
    Array.isArray(value.initialBoard) &&
    Array.isArray(value.initialRevealedCells) &&
    Array.isArray(value.actions)
  );
}
