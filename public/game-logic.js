export function createGame(rows = 9, cols = 9, mineCount = 10, rng = Math.random) {
  const total = rows * cols;
  const mines = Math.max(1, Math.min(mineCount, total - 1));
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      isFaded: false,
      adjacent: 0
    }))
  );

  let placed = 0;
  while (placed < mines) {
    const index = Math.floor(rng() * total);
    const r = Math.floor(index / cols);
    const c = index % cols;
    if (!board[r][c].isMine) {
      board[r][c].isMine = true;
      placed += 1;
    }
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c].isMine) {
        continue;
      }
      board[r][c].adjacent = getNeighbors(rows, cols, r, c).filter(
        ([nr, nc]) => board[nr][nc].isMine
      ).length;
    }
  }

  return {
    rows,
    cols,
    mineCount: mines,
    board,
    gameOver: false,
    won: false
  };
}

function getNeighbors(rows, cols, row, col) {
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push([nr, nc]);
      }
    }
  }
  return neighbors;
}

function revealFlood(game, row, col) {
  const queue = [[row, col]];

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const cell = game.board[r][c];

    if (cell.isRevealed || cell.isFlagged || cell.isMine) {
      continue;
    }

    cell.isRevealed = true;

    if (cell.adjacent === 0) {
      getNeighbors(game.rows, game.cols, r, c).forEach(([nr, nc]) => {
        const next = game.board[nr][nc];
        if (!next.isRevealed && !next.isFlagged && !next.isMine) {
          queue.push([nr, nc]);
        }
      });
    }
  }
}

function updateWinState(game) {
  const won = game.board.every((row) =>
    row.every((cell) => cell.isMine || cell.isRevealed)
  );
  game.won = won;
  if (won) {
    game.gameOver = true;
  }
}

export function revealCell(game, row, col) {
  if (game.gameOver || game.won) {
    return;
  }

  const cell = game.board[row]?.[col];
  if (!cell || cell.isRevealed || cell.isFlagged) {
    return;
  }

  if (cell.isMine) {
    cell.isRevealed = true;
    game.gameOver = true;
    return;
  }

  revealFlood(game, row, col);
  updateWinState(game);
}

export function flagCell(game, row, col, options = {}) {
  if (game.gameOver || game.won) {
    return;
  }

  const cell = game.board[row]?.[col];
  if (!cell || cell.isRevealed || cell.isFlagged) {
    return;
  }

  cell.isFlagged = true;
  if (options.fadeFlagged) {
    cell.isFaded = true;
  }

  getNeighbors(game.rows, game.cols, row, col).forEach(([nr, nc]) => {
    const neighbor = game.board[nr][nc];
    if (!neighbor.isMine) {
      revealFlood(game, nr, nc);
    }
  });

  updateWinState(game);
}
