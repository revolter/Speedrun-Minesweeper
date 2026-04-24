import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIFFICULTY_OPTIONS,
  DEFAULT_DIFFICULTY_KEY,
  difficultyConfigForKey,
  mineCountForDifficulty
} from '../public/difficulty.js';

test('difficulty options expose expected presets', () => {
  assert.equal(Array.isArray(DIFFICULTY_OPTIONS), true);
  assert.deepEqual(
    DIFFICULTY_OPTIONS.map((option) => option.key),
    ['easy', 'normal', 'hard', 'hardest']
  );
});

test('difficulty config falls back to default for invalid key', () => {
  const fallback = difficultyConfigForKey('invalid-key');
  assert.equal(fallback.key, DEFAULT_DIFFICULTY_KEY);
});

test('mine count scales by difficulty and stays within valid bounds', () => {
  assert.equal(mineCountForDifficulty(10, 81, 'easy'), 8);
  assert.equal(mineCountForDifficulty(10, 81, 'normal'), 10);
  assert.equal(mineCountForDifficulty(10, 81, 'hard'), 14);
  assert.equal(mineCountForDifficulty(10, 81, 'hardest'), 18);
  assert.equal(mineCountForDifficulty(1, 4, 'easy'), 1);
  assert.equal(mineCountForDifficulty(10, 4, 'hard'), 3);
});
