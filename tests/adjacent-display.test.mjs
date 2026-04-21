import test from 'node:test';
import assert from 'node:assert/strict';
import { displayedAdjacentValue } from '../public/adjacent-display.js';

function cell(adjacent, options = {}) {
  return {
    adjacent,
    isRevealed: options.isRevealed ?? true,
    isMine: options.isMine ?? false,
    isFlagged: options.isFlagged ?? false,
    isHidden: options.isHidden ?? false
  };
}

test('returns original adjacent value when hide flagged preference is off', () => {
  const value = displayedAdjacentValue(cell(2), [cell(0, { isFlagged: true, isHidden: true })], false);
  assert.equal(value, 2);
});

test('subtracts flagged neighbors from revealed number cells when hide preference is on', () => {
  const value = displayedAdjacentValue(cell(3), [
    cell(0, { isFlagged: true, isHidden: true }),
    cell(0, { isFlagged: true, isHidden: false }),
    null
  ], true);
  assert.equal(value, 1);
});

test('keeps at least 1 for originally non-zero number cells', () => {
  const value = displayedAdjacentValue(cell(1), [cell(0, { isFlagged: true, isHidden: true })], true);
  assert.equal(value, 1);
});
