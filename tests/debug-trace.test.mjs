import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame } from '../public/game-logic.js';
import {
  createDebugTrace,
  isDebugTrace,
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

  assert.equal(isDebugTrace(basic), true);
  assert.equal(isDebugTrace(edgeWin), true);
  assert.equal(isDebugTrace(hiddenNumberRegression), true);
  assert.equal(isDebugTrace(hideOnesAfterFlagRegression), true);
  assert.equal(isDebugTrace(hideOnesTopRowRegression), true);
  assert.equal(isDebugTrace(localDeductionRegression), true);
  assert.equal(isDebugTrace(hiddenMineAdjacentRegression), true);
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
});

test('hidden mine with adjacent unrevealed mine shows its adjacent count in hide-flag snapshot', () => {
  const trace = fixture('debug-trace-hidden-mine-adjacent-regression.json');
  const hideFlagAction = trace.actions.find((action) => action.action === 'hide-flag');

  assert.ok(hideFlagAction);
  assert.equal(hideFlagAction.row, 0);
  assert.equal(hideFlagAction.col, 4);
  assert.equal(hideFlagAction.snapshot[0][4], '1');
});
