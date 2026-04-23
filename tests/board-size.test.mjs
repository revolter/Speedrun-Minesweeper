import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_SIZE_OPTIONS, DEFAULT_BOARD_SIZE_KEY, boardSizeConfigForKey } from '../public/board-size.js';

test('board size options expose expected presets', () => {
  assert.equal(Array.isArray(BOARD_SIZE_OPTIONS), true);
  assert.equal(BOARD_SIZE_OPTIONS.length, 3);
  assert.deepEqual(
    BOARD_SIZE_OPTIONS.map((option) => option.key),
    ['small', 'medium', 'large']
  );
});

test('board size config falls back to default for invalid key', () => {
  const fallback = boardSizeConfigForKey('invalid-key');
  assert.equal(fallback.key, DEFAULT_BOARD_SIZE_KEY);
  assert.equal(fallback.rows, 9);
  assert.equal(fallback.cols, 9);
  assert.equal(fallback.mines, 10);
});
