import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, isBoardSolvable, revealCell, flagCell } from '../public/game-logic.js';

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
    explodedCell: null,
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
  assert.deepEqual(game.explodedCell, { row: 2, col: 2, reason: 'wrong-flag' });
  assert.equal(game.board.flat().every((cell) => cell.isRevealed), true);
});

test('revealing a mine loses the game and reveals the entire board', () => {
  const game = createManualGame(3, 3, [[1, 1]]);

  revealCell(game, 1, 1);

  assert.equal(game.gameOver, true);
  assert.equal(game.won, false);
  assert.deepEqual(game.explodedCell, { row: 1, col: 1, reason: 'mine' });
  assert.equal(game.board.flat().every((cell) => cell.isRevealed), true);
});

test('losing reveals hidden flagged cells', () => {
  // 3x3: mines at (0,0) and (1,2). After flagging (0,0) with hideFlagged,
  // (0,1) has adj=2 so deduction cannot trigger, leaving (0,2) unrevealed.
  const game = createManualGame(3, 3, [
    [0, 0],
    [1, 2]
  ]);
  flagCell(game, 0, 0, { hideFlagged: true });
  assert.equal(game.board[0][0].isHidden, true);

  flagCell(game, 0, 2, { hideFlagged: true });

  assert.equal(game.gameOver, true);
  assert.equal(game.board[0][0].isHidden, false);
});

test('flagging reveals safe cells adjacent to the mine and cascades further deductions', () => {
  const game = createManualGame(3, 3, [[0, 0]]);

  flagCell(game, 0, 0);

  assert.equal(game.board[0][1].isRevealed, true);
  assert.equal(game.board[1][0].isRevealed, true);
  assert.equal(game.board[1][1].isRevealed, true);
  assert.equal(game.board[2][2].isRevealed, true);
  assert.equal(game.won, true);
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

test('isBoardSolvable returns true for a trivially solvable board', () => {
  // 3x3, mine at (2,2). Zero region top-left floods to reveal all safe cells.
  // (1,2) has adj=1 with only (2,2) unknown -> deduced mine, flags it,
  // which auto-reveals its safe neighbors (already revealed).
  const game = createManualGame(3, 3, [[2, 2]]);
  game.board[0][0].isRevealed = true;
  game.board[0][1].isRevealed = true;
  game.board[0][2].isRevealed = true;
  game.board[1][0].isRevealed = true;
  game.board[1][1].isRevealed = true;
  game.board[1][2].isRevealed = true;
  game.board[2][0].isRevealed = true;
  game.board[2][1].isRevealed = true;

  assert.equal(isBoardSolvable(game), true);
});

test('isBoardSolvable returns false when a mine cannot be deduced', () => {
  // 3x3, mines at (0,0) and (2,2).
  // Only (0,1) is revealed with adj=1 and two unknown neighbors -> ambiguous.
  const game = createManualGame(3, 3, [[0, 0], [2, 2]]);
  game.board[0][1].isRevealed = true;

  assert.equal(isBoardSolvable(game), false);
});

test('isBoardSolvable returns true when auto-reveal-on-flag cascades to complete the board', () => {
  // 2x3, mine at (0,0). (0,1) is revealed (adj=1) with only (0,0) unknown -> flag it.
  // Flagging (0,0) auto-reveals all its safe neighbors -> completes the board.
  const game = createManualGame(2, 3, [[0, 0]]);
  game.board[0][1].isRevealed = true;
  game.board[0][2].isRevealed = true;
  game.board[1][0].isRevealed = true;
  game.board[1][1].isRevealed = true;
  game.board[1][2].isRevealed = true;

  assert.equal(isBoardSolvable(game), true);
});

test('createGame always produces a solvable board', () => {
  const seeds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const seed of seeds) {
    let state = seed;
    const rng = () => {
      state = (state * 1664525 + 1013904223) & 0xffffffff;
      return (state >>> 0) / 0x100000000;
    };
    const game = createGame(9, 9, 10, rng);
    assert.equal(isBoardSolvable(game), true, `board with seed ${seed} should be solvable`);
  }
});
