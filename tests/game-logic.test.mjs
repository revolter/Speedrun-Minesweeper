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

function createManualGame(rows, cols, mineCells) {
  const mineSet = new Set(mineCells.map(([r, c]) => `${r},${c}`));
  const board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      isMine: mineSet.has(`${r},${c}`),
      isRevealed: false,
      isFlagged: false,
      isHidden: false,
      adjacent: 0
    }))
  );

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c].isMine) {
        continue;
      }
      let adjacent = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) {
            continue;
          }
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
            adjacent += 1;
          }
        }
      }
      board[r][c].adjacent = adjacent;
    }
  }

  return {
    rows,
    cols,
    mineCount: mineCells.length,
    board,
    gameOver: false,
    won: false
  };
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

test('new game starts with an auto-expanded safe area', () => {
  let i = 0;
  const game = createGame(9, 9, 10, () => {
    const value = (i % 81) / 81;
    i += 1;
    return value;
  });
  const revealed = game.board.flat().filter((cell) => cell.isRevealed);
  assert.ok(revealed.length > 1);
  assert.equal(revealed.some((cell) => cell.isMine), false);
});

test('hide preference applies when flagging', () => {
  const game = createDeterministicGame();

  flagCell(game, 2, 2, { hideFlagged: true });
  assert.equal(game.board[2][2].isFlagged, true);
  assert.equal(game.board[2][2].isHidden, true);

  revealCell(game, 2, 2);
  assert.equal(game.board[2][2].isRevealed, false);
});

test('flagging an incorrect cell immediately loses the game', () => {
  const game = createManualGame(3, 3, [[0, 0]]);

  flagCell(game, 2, 2);

  assert.equal(game.board[2][2].isFlagged, true);
  assert.equal(game.gameOver, true);
  assert.equal(game.won, false);
});

test('flagging only reveals safe cells adjacent to the newly flagged mine', () => {
  const game = createManualGame(3, 3, [[0, 0]]);

  flagCell(game, 0, 0);

  assert.equal(game.board[0][1].isRevealed, true);
  assert.equal(game.board[1][0].isRevealed, true);
  assert.equal(game.board[1][1].isRevealed, true);
  assert.equal(game.board[2][2].isRevealed, false);
  assert.equal(game.won, false);
});

test('game is won when all mines are flagged and all safe cells are revealed', () => {
  const game = createManualGame(2, 2, [[0, 0]]);

  revealCell(game, 0, 1);
  revealCell(game, 1, 0);
  revealCell(game, 1, 1);
  assert.equal(game.won, false);

  flagCell(game, 0, 0);
  assert.equal(game.won, true);
});

test('flagging triggers local numbered-cell deduction reveals', () => {
  const game = createManualGame(4, 4, [
    [1, 0],
    [0, 3]
  ]);
  game.board[1][1].isRevealed = true;

  flagCell(game, 1, 0);

  assert.equal(game.board[2][2].isRevealed, true);
});
