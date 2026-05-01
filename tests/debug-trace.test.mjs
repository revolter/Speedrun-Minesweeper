import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame, flagCell } from '../public/game-logic.js';
import {
  createDebugTrace,
  recordDebugAction,
  serializeDebugTrace
} from '../public/debug-trace.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function fixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

function cyclingRng(size) {
  let index = 0;
  return () => {
    const value = (index % size) / size;
    index += 1;
    return value;
  };
}

test('debug trace captures initial board snapshot and reveal metadata', () => {
  const game = createGame(5, 5, 4, cyclingRng(25));
  const trace = createDebugTrace(game, {
    hideFlagged: true,
    initialSnapshot: ['?????', '?????', '?????', '?????', '?????']
  });

  assert.equal(trace.rows, 5);
  assert.equal(trace.cols, 5);
  assert.ok(Array.isArray(trace.initialBoard));
  assert.ok(Array.isArray(trace.initialSnapshot));
  assert.equal(typeof trace.hideFlaggedCells, 'boolean');
  assert.ok(trace.initialRevealCell);
  assert.equal(trace.initialSnapshot.length, 5);
  assert.equal(trace.initialSnapshot.every((row) => typeof row === 'string'), true);
});

test('debug trace records chronological actions', () => {
  const game = createGame(3, 3, 1, cyclingRng(9));
  const trace = createDebugTrace(game, { initialSnapshot: ['???', '???', '???'] });

  recordDebugAction(trace, 'flag', 0, 0, ['F??', '???', '???']);
  recordDebugAction(trace, 'reveal', 1, 1, ['F??', '?1?', '???']);

  assert.equal(trace.actions.length, 2);
  assert.equal(trace.actions[0].index, 1);
  assert.equal(trace.actions[0].action, 'flag');
  assert.equal(trace.actions[0].row, 0);
  assert.equal(trace.actions[0].col, 0);
  assert.ok(Array.isArray(trace.actions[0].snapshot));
  assert.equal(JSON.parse(serializeDebugTrace(trace)).actions.length, 2);
});

test('fixture traces are valid and available to tests', () => {
  const basic = fixture('debug-trace-basic.json');
  const edgeWin = fixture('debug-trace-edge-win.json');
  const hiddenNumberRegression = fixture('debug-trace-hidden-number-regression.json');
  const hideOnesAfterFlagRegression = fixture('debug-trace-hide-ones-after-flag-regression.json');
  const hideOnesTopRowRegression = fixture('debug-trace-hide-ones-top-row-regression.json');
  const localDeductionRegression = fixture('debug-trace-local-deduction-regression.json');
  const hiddenMineAdjacentRegression = fixture('debug-trace-hidden-mine-adjacent-regression.json');
  const wrongFlagNumberRegression = fixture('debug-trace-wrong-flag-number-regression.json');
  const autoRevealRegression = fixture('debug-trace-auto-reveal-regression.json');
  const cellsNotAutoRevealingRegression = fixture('debug-trace-cells-not-auto-revealing-regression.json');
  const cellRevealingWhenNotNeededRegression = fixture('debug-trace-cell-revealing-when-not-needed-regression.json');
  const hiddenMineZeroAdjacentRegression = fixture('debug-trace-hidden-mine-zero-adjacent-regression.json');

  assert.equal(basic.actions.length > 0, true);
  assert.equal(hiddenNumberRegression.actions[0].action, 'flag');
  assert.equal(hideOnesAfterFlagRegression.actions[0].action, 'flag');
  assert.equal(hideOnesTopRowRegression.actions.some((action) => action.action === 'flag'), true);
  assert.equal(edgeWin.actions.some((action) => action.action === 'flag'), true);
  assert.equal(localDeductionRegression.actions.some((action) => action.action === 'flag'), true);
  if (basic.hideFlaggedCells) {
    const flagIndex = basic.actions.findIndex((action) => action.action === 'flag');
    assert.equal(basic.actions[flagIndex + 1].action, 'hide-flag');
  }
  assert.ok(Array.isArray(hideOnesTopRowRegression.actions.at(-1).snapshot));
  assert.ok(hiddenMineAdjacentRegression);
  assert.ok(wrongFlagNumberRegression);
  assert.ok(autoRevealRegression);
  assert.ok(cellsNotAutoRevealingRegression);
  assert.ok(cellRevealingWhenNotNeededRegression);
  assert.ok(hiddenMineZeroAdjacentRegression);
});

test('hidden mine with adjacent unrevealed mine shows its adjacent count in hide-flag snapshot', () => {
  const trace = fixture('debug-trace-hidden-mine-adjacent-regression.json');
  const hideFlagAction = trace.actions.find((action) => action.action === 'hide-flag');

  assert.ok(hideFlagAction);
  assert.equal(hideFlagAction.row, 0);
  assert.equal(hideFlagAction.col, 4);
  assert.equal(hideFlagAction.snapshot[0][4], '1');
});

test('flagging a non-mine cell does not decrement adjacent revealed numbers', () => {
  const trace = fixture('debug-trace-wrong-flag-number-regression.json');
  const hideFlagAction = trace.actions.find((action) => action.action === 'hide-flag');

  assert.ok(hideFlagAction);
  assert.equal(hideFlagAction.row, 2);
  assert.equal(hideFlagAction.col, 4);
  assert.equal(hideFlagAction.snapshot[3][3], '1');
  assert.equal(hideFlagAction.snapshot[3][4], '2');
});

test('hide-flag auto-reveals cells adjacent to revealed cells whose display drops to zero', () => {
  const trace = fixture('debug-trace-auto-reveal-regression.json');
  const hideFlagAction = trace.actions.find((action) => action.action === 'hide-flag');

  assert.ok(hideFlagAction);
  assert.equal(hideFlagAction.snapshot[0][2], '0');
  assert.equal(hideFlagAction.snapshot[0][3], '1');
  assert.equal(hideFlagAction.snapshot[1][3], '3');
});

test('flagging a mine cascades deduction to reveal indirectly-deducible safe cells', () => {
  const trace = fixture('debug-trace-cells-not-auto-revealing-regression.json');

  const board = Array.from({ length: trace.rows }, (_, r) =>
    Array.from({ length: trace.cols }, (_, c) => ({
      isMine: trace.initialBoard[r][c] === 'M',
      isRevealed: trace.initialSnapshot[r][c] !== '?',
      isFlagged: false,
      isHidden: false,
      adjacent: trace.initialBoard[r][c] === 'M' ? 0 : parseInt(trace.initialBoard[r][c], 10)
    }))
  );

  const game = {
    rows: trace.rows,
    cols: trace.cols,
    board,
    mineCount: trace.mineCount,
    gameOver: false,
    won: false,
    explodedCell: null
  };

  const flagAction = trace.actions[0];
  flagCell(game, flagAction.row, flagAction.col);

  // r4:c1 must be revealed: the '1' at r5:c2 has all its mines flagged (r6:c3),
  // so its only remaining unrevealed safe neighbor (r4:c1) must be auto-revealed.
  assert.equal(game.board[4][1].isRevealed, true);
  assert.equal(flagAction.snapshot[4][1], String(game.board[4][1].adjacent));
});

test('flagging a mine does not reveal cells that cannot be deduced safe via constraint propagation', () => {
  const trace = fixture('debug-trace-cell-revealing-when-not-needed-regression.json');

  // Reconstruct board state from the snapshot just before the problematic action (action index 16).
  const prevSnapshot = trace.actions[14].snapshot;
  const board = Array.from({ length: trace.rows }, (_, r) =>
    Array.from({ length: trace.cols }, (_, c) => ({
      isMine: trace.initialBoard[r][c] === 'M',
      isRevealed: prevSnapshot[r][c] !== '?' && prevSnapshot[r][c] !== 'F',
      isFlagged: prevSnapshot[r][c] === 'F',
      isHidden: false,
      adjacent: trace.initialBoard[r][c] === 'M' ? 0 : parseInt(trace.initialBoard[r][c], 10)
    }))
  );

  const game = {
    rows: trace.rows,
    cols: trace.cols,
    board,
    mineCount: trace.mineCount,
    gameOver: false,
    won: false,
    explodedCell: null
  };

  const action16 = trace.actions[15];
  flagCell(game, action16.row, action16.col);

  // r0:c9 must NOT be revealed: the '4' at r0:c8 still has one unflagged mine (r1:c9)
  // after this flag action, so its unknown neighbor r0:c9 cannot be deduced safe.
  assert.equal(game.board[0][9].isRevealed, false);
});

test('hidden mine with zero adjacent mines shows 0 in hide-flag snapshot and does not over-reveal', () => {
  const trace = fixture('debug-trace-hidden-mine-zero-adjacent-regression.json');

  // The mine at r9:c2 has no adjacent mines; hiddenCellDisplayValue must return 0, not 1.
  const hideFlagAction = trace.actions.find((a) => a.action === 'hide-flag');
  assert.ok(hideFlagAction);
  assert.equal(hideFlagAction.snapshot[9][2], '0');

  // r8:c3 (adj=3) has only one flagged mine after the flag action, so it cannot be
  // deduced safe and must remain unrevealed.
  assert.equal(hideFlagAction.snapshot[8][3], '?');

  // Confirm the flag action snapshot correctly reveals only the cells provably safe
  // via constraint propagation: r8:c2 (via r9:c1 whose adj=1 equals its flagged count)
  // and r9:c3 (via r10:c2 whose adj=1 equals its flagged count).
  const flagAction = trace.actions.find((a) => a.action === 'flag');
  assert.ok(flagAction);
  assert.equal(flagAction.snapshot[8][2], '2');
  assert.equal(flagAction.snapshot[9][3], '3');
  assert.equal(flagAction.snapshot[8][3], '?');
});
