import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function fixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

test('revealed 1-cells adjacent to a hidden flagged mine collapse to 0 in debug snapshot', () => {
  const trace = fixture('debug-trace-hide-ones-after-flag-regression.json');
  const flagAction = trace.actions.findLast((action) => action.action === 'flag');
  const hideFlagAction = trace.actions.findLast((action) => action.action === 'hide-flag');
  const snapshot = (hideFlagAction || trace.actions.at(-1)).snapshot;

  assert.ok(flagAction);

  let checked = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const r = flagAction.row + dr;
      const c = flagAction.col + dc;
      if (r < 0 || c < 0 || r >= trace.rows || c >= trace.cols) {
        continue;
      }
      if (trace.initialBoard[r][c] === '1' && snapshot[r][c] !== '?') {
        checked += 1;
        assert.equal(snapshot[r][c], '0');
      }
    }
  }

  assert.ok(checked > 0);
});

test('top-row revealed 1-cells adjacent to a hidden flagged mine collapse to 0 in debug snapshot', () => {
  const trace = fixture('debug-trace-hide-ones-top-row-regression.json');
  const hideFlagAction = trace.actions.findLast((action) => action.action === 'hide-flag');
  const snapshot = (hideFlagAction || trace.actions.at(-1)).snapshot;

  const expectedTargets = [
    [0, 2],
    [1, 2],
    [1, 3],
    [1, 4],
    [0, 4]
  ];

  expectedTargets.forEach(([row, col]) => {
    assert.equal(snapshot[row][col], '0');
  });
});
