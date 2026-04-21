import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flagCell, revealCell } from '../public/game-logic.js';
import { displayedAdjacentValue } from '../public/adjacent-display.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function fixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

function toGame(trace) {
  const revealed = new Set(trace.initialRevealedCells.map(([row, col]) => `${row},${col}`));
  return {
    rows: trace.rows,
    cols: trace.cols,
    mineCount: trace.mineCount,
    gameOver: false,
    won: false,
    board: trace.initialBoard.map((row, r) =>
      row.map((value, c) => ({
        isMine: value === 'M',
        adjacent: value === 'M' ? 0 : value,
        isRevealed: revealed.has(`${r},${c}`),
        isFlagged: false,
        isHidden: false
      }))
    )
  };
}

function neighbors(game, row, col) {
  return [
    game.board[row - 1]?.[col - 1],
    game.board[row - 1]?.[col],
    game.board[row - 1]?.[col + 1],
    game.board[row]?.[col - 1],
    game.board[row]?.[col + 1],
    game.board[row + 1]?.[col - 1],
    game.board[row + 1]?.[col],
    game.board[row + 1]?.[col + 1]
  ];
}

test('revealed 1-cells adjacent to a hidden flagged mine collapse to 0 display', () => {
  const trace = fixture('debug-trace-hide-ones-after-flag-regression.json');
  const game = toGame(trace);

  trace.actions.forEach((action) => {
    if (action.action === 'flag') {
      flagCell(game, action.row, action.col, { hideFlagged: true });
      return;
    }
    revealCell(game, action.row, action.col);
  });

  const oneCellsNextToFlag = [];
  for (let r = 0; r < game.rows; r += 1) {
    for (let c = 0; c < game.cols; c += 1) {
      const cell = game.board[r][c];
      if (!cell.isRevealed || cell.isMine || cell.adjacent !== 1) {
        continue;
      }
      const adjacentCells = neighbors(game, r, c);
      if (adjacentCells.some((neighbor) => neighbor?.isFlagged)) {
        oneCellsNextToFlag.push([r, c, displayedAdjacentValue(cell, adjacentCells, true)]);
      }
    }
  }

  assert.ok(oneCellsNextToFlag.length > 0);
  oneCellsNextToFlag.forEach(([, , displayed]) => assert.equal(displayed, 0));
});

test('top-row revealed 1-cells adjacent to a hidden flagged mine collapse to 0 display', () => {
  const trace = fixture('debug-trace-hide-ones-top-row-regression.json');
  const game = toGame(trace);

  trace.actions.forEach((action) => {
    if (action.action === 'flag') {
      flagCell(game, action.row, action.col, { hideFlagged: true });
      return;
    }
    revealCell(game, action.row, action.col);
  });

  const expectedTargets = [
    [0, 2],
    [1, 2],
    [1, 3],
    [1, 4],
    [0, 4]
  ];

  expectedTargets.forEach(([row, col]) => {
    const cell = game.board[row][col];
    const adjacentCells = neighbors(game, row, col);
    assert.equal(cell.isRevealed, true);
    assert.equal(cell.adjacent, 1);
    assert.equal(displayedAdjacentValue(cell, adjacentCells, true), 0);
  });
});
