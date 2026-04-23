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

test('does not subtract flagged neighbors when hide preference is off', () => {
  const value = displayedAdjacentValue(cell(3), [cell(0, { isFlagged: true, isHidden: false })], false);
  assert.equal(value, 3);
});

test('subtracts flagged mine neighbors from revealed number cells when hide preference is on', () => {
  const value = displayedAdjacentValue(cell(3), [
    cell(0, { isMine: true, isFlagged: true, isHidden: true }),
    cell(0, { isMine: true, isFlagged: true, isHidden: false }),
    null
  ], true);
  assert.equal(value, 1);
});

test('shows 0 when flagged mine neighbors satisfy a revealed number cell', () => {
  const value = displayedAdjacentValue(cell(1), [cell(0, { isMine: true, isFlagged: true, isHidden: true })], true);
  assert.equal(value, 0);
});

test('does not subtract non-mine flagged neighbors from adjacent count', () => {
  const value = displayedAdjacentValue(cell(1), [cell(0, { isMine: false, isFlagged: true, isHidden: true })], true);
  assert.equal(value, 1);
});
