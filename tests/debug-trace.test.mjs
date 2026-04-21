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
  const trace = createDebugTrace(game);

  assert.equal(trace.rows, 5);
  assert.equal(trace.cols, 5);
  assert.ok(Array.isArray(trace.initialBoard));
  assert.ok(Array.isArray(trace.initialSnapshot));
  assert.ok(trace.initialRevealCell);
  assert.ok(trace.initialSnapshot.some((row) => row.includes('0')));
});

test('debug trace records chronological actions', () => {
  const game = createGame(3, 3, 1, cyclingRng(9));
  const trace = createDebugTrace(game);

  recordDebugAction(trace, 'flag', game);
  recordDebugAction(trace, 'reveal', game);

  assert.equal(trace.actions.length, 2);
  assert.equal(trace.actions[0].index, 1);
  assert.equal(trace.actions[0].action, 'flag');
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

  assert.equal(isDebugTrace(basic), true);
  assert.equal(isDebugTrace(edgeWin), true);
  assert.equal(isDebugTrace(hiddenNumberRegression), true);
  assert.equal(isDebugTrace(hideOnesAfterFlagRegression), true);
  assert.equal(isDebugTrace(hideOnesTopRowRegression), true);
  assert.equal(isDebugTrace(localDeductionRegression), true);
  assert.equal(basic.actions.length > 0, true);
  assert.equal(edgeWin.actions.at(-1).action, 'flag');
  assert.equal(hiddenNumberRegression.actions[0].action, 'flag');
  assert.equal(localDeductionRegression.actions.at(-1).action, 'flag');
  assert.equal(hideOnesAfterFlagRegression.actions[0].action, 'flag');
  assert.equal(hideOnesTopRowRegression.actions.at(-1).action, 'flag');
  assert.ok(Array.isArray(hideOnesTopRowRegression.actions.at(-1).snapshot));
});
