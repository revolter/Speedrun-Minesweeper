import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, revealCell, flagCell } from '../public/game-logic.js';

function createDeterministicGame() {
  const picks = [0, 8];
  let i = 0;
  const rng = () => {
    const value = picks[i % picks.length] / 9;
    i += 1;
    return value;
  };
  return createGame(3, 3, 2, rng);
}

test('flagging is irreversible and cannot be toggled', () => {
  const game = createDeterministicGame();

  flagCell(game, 0, 0);
  assert.equal(game.board[0][0].isFlagged, true);

  flagCell(game, 0, 0);
  assert.equal(game.board[0][0].isFlagged, true);
});

test('flagging auto-reveals nearby safe cells', () => {
  const game = createDeterministicGame();

  flagCell(game, 0, 0);

  assert.equal(game.board[0][1].isRevealed, true);
  assert.equal(game.board[1][0].isRevealed, true);
  assert.equal(game.board[1][1].isRevealed, true);
});

test('fade preference applies when flagging', () => {
  const game = createDeterministicGame();

  flagCell(game, 2, 2, { fadeFlagged: true });
  assert.equal(game.board[2][2].isFlagged, true);
  assert.equal(game.board[2][2].isFaded, true);

  revealCell(game, 2, 2);
  assert.equal(game.board[2][2].isRevealed, false);
});
