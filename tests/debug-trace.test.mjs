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
  assert.ok(trace.initialRevealCell);
  assert.ok(trace.initialRevealedCells.length > 0);
});

test('debug trace records chronological actions', () => {
  const game = createGame(3, 3, 1, cyclingRng(9));
  const trace = createDebugTrace(game);

  recordDebugAction(trace, 'flag', 0, 0);
  recordDebugAction(trace, 'reveal', 1, 1);

  assert.deepEqual(trace.actions, [
    { index: 1, action: 'flag', row: 0, col: 0 },
    { index: 2, action: 'reveal', row: 1, col: 1 }
  ]);
  assert.equal(JSON.parse(serializeDebugTrace(trace)).actions.length, 2);
});

test('fixture traces are valid and available to tests', () => {
  const basic = fixture('debug-trace-basic.json');
  const edgeWin = fixture('debug-trace-edge-win.json');

  assert.equal(isDebugTrace(basic), true);
  assert.equal(isDebugTrace(edgeWin), true);
  assert.equal(basic.actions.length > 0, true);
  assert.equal(edgeWin.actions.at(-1).action, 'flag');
});
