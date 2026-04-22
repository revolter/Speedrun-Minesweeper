import { displayedAdjacentValue } from './adjacent-display.js';

export const DEBUG_TRACE_FORMAT = 'speedrun-minesweeper-debug-v3';

function boardCellChar(cell) {
  return cell.isMine ? 'M' : String(cell.adjacent);
}

function boardSnapshot(game) {
  return game.board.map((row) => row.map(boardCellChar).join(''));
}

function visibleSnapshot(game, options = {}) {
  const hideFlagged = options.hideFlagged ?? true;
  const showFlags = options.showFlags ?? false;
  const rows = [];
  for (let row = 0; row < game.rows; row += 1) {
    let text = '';
    for (let col = 0; col < game.cols; col += 1) {
      const cell = game.board[row][col];
      if (cell.isFlagged) {
        if (showFlags || !hideFlagged) {
          text += 'F';
        } else {
          text += '0';
        }
        continue;
      }
      if (!cell.isRevealed) {
        text += '?';
        continue;
      }
      if (cell.isMine) {
        text += 'M';
        continue;
      }
      const neighbors = [
        game.board[row - 1]?.[col - 1],
        game.board[row - 1]?.[col],
        game.board[row - 1]?.[col + 1],
        game.board[row]?.[col - 1],
        game.board[row]?.[col + 1],
        game.board[row + 1]?.[col - 1],
        game.board[row + 1]?.[col],
        game.board[row + 1]?.[col + 1]
      ];
      text += String(displayedAdjacentValue(cell, neighbors, hideFlagged));
    }
    rows.push(text);
  }
  return rows;
}

export function createDebugTrace(game, options = {}) {
  const hideFlagged = options.hideFlagged ?? true;
  return {
    format: DEBUG_TRACE_FORMAT,
    hideFlaggedCells: hideFlagged,
    rows: game.rows,
    cols: game.cols,
    mineCount: game.mineCount,
    initialRevealCell: game.initialRevealCell,
    initialBoard: boardSnapshot(game),
    initialSnapshot: visibleSnapshot(game, { hideFlagged }),
    actions: []
  };
}

export function recordDebugAction(trace, action, row, col, game, options = {}) {
  const hideFlagged = options.hideFlagged ?? true;
  const showFlags = options.showFlags ?? false;
  trace.actions.push({
    index: trace.actions.length + 1,
    action,
    row,
    col,
    snapshot: visibleSnapshot(game, { hideFlagged, showFlags })
  });
}

export function serializeDebugTrace(trace) {
  return JSON.stringify(trace, null, 2);
}

export function isDebugTrace(value) {
  return (
    value &&
    value.format === DEBUG_TRACE_FORMAT &&
    typeof value.hideFlaggedCells === 'boolean' &&
    Number.isInteger(value.rows) &&
    Number.isInteger(value.cols) &&
    Array.isArray(value.initialBoard) &&
    value.initialBoard.every((row) => typeof row === 'string') &&
    Array.isArray(value.initialSnapshot) &&
    value.initialSnapshot.every((row) => typeof row === 'string') &&
    Array.isArray(value.actions) &&
    value.actions.every(
      (action) =>
        Number.isInteger(action.index) &&
        typeof action.action === 'string' &&
        Number.isInteger(action.row) &&
        Number.isInteger(action.col) &&
        Array.isArray(action.snapshot) &&
        action.snapshot.every((row) => typeof row === 'string')
    )
  );
}
