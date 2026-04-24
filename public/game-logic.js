const MAX_SOLVABLE_ATTEMPTS = 1000;
const MIN_SAFE_REGION_SIZE = 2;

export function createGame(rows = 9, cols = 9, mineCount = 10, rng = Math.random) {
  const total = rows * cols;
  const mines = Math.max(1, Math.min(mineCount, total - 1));

  for (let attempts = 0; attempts < MAX_SOLVABLE_ATTEMPTS; attempts += 1) {
    const game = buildGame(rows, cols, mines, rng);
    if (revealInitialArea(game) && isBoardSolvable(game)) {
      return game;
    }
  }

  const fallback = buildGame(rows, cols, mines, rng);
  if (!revealInitialArea(fallback)) {
    revealAnySafeCell(fallback);
  }
  return fallback;
}

export function isBoardSolvable(game) {
  const { rows, cols, board } = game;
  const revealed = new Set();
  const flagged = new Set();

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c].isRevealed) {
        revealed.add(`${r},${c}`);
      }
    }
  }

  function floodReveal(r, c) {
    const key = `${r},${c}`;
    if (revealed.has(key) || flagged.has(key) || board[r][c].isMine) {
      return;
    }
    revealed.add(key);
    if (board[r][c].adjacent === 0) {
      getNeighbors(rows, cols, r, c).forEach(([nr, nc]) => {
        floodReveal(nr, nc);
      });
    }
  }

  function flagMine(r, c) {
    const key = `${r},${c}`;
    if (flagged.has(key)) {
      return;
    }
    flagged.add(key);
    getNeighbors(rows, cols, r, c).forEach(([nr, nc]) => {
      const nkey = `${nr},${nc}`;
      if (!board[nr][nc].isMine && !revealed.has(nkey)) {
        floodReveal(nr, nc);
      }
    });
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const key = `${r},${c}`;
        if (!revealed.has(key) || board[r][c].isMine) {
          continue;
        }
        const adj = board[r][c].adjacent;
        const neighbors = getNeighbors(rows, cols, r, c);
        const flaggedNeighbors = neighbors.filter(([nr, nc]) => flagged.has(`${nr},${nc}`));
        const unknownNeighbors = neighbors.filter(([nr, nc]) => {
          const nkey = `${nr},${nc}`;
          return !revealed.has(nkey) && !flagged.has(nkey);
        });
        if (flaggedNeighbors.length === adj && unknownNeighbors.length > 0) {
          unknownNeighbors.forEach(([nr, nc]) => {
            floodReveal(nr, nc);
            changed = true;
          });
        } else if (unknownNeighbors.length > 0 && flaggedNeighbors.length + unknownNeighbors.length === adj) {
          unknownNeighbors.forEach(([nr, nc]) => {
            flagMine(nr, nc);
            changed = true;
          });
        }
      }
    }
  }

  return board.every((row, r) =>
    row.every((cell, c) => cell.isMine || revealed.has(`${r},${c}`))
  );
}

function buildGame(rows, cols, mines, rng) {
  const total = rows * cols;
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      isHidden: false,
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
    initialRevealCell: null,
    explodedCell: null,
    board,
    gameOver: false,
    won: false
  };
}

function zeroRegionSize(game, row, col) {
  const seen = new Set();
  const queue = [[row, col]];
  let size = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const key = `${r},${c}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const cell = game.board[r][c];
    if (cell.isMine || cell.adjacent !== 0) {
      continue;
    }

    size += 1;
    getNeighbors(game.rows, game.cols, r, c).forEach(([nr, nc]) => {
      const neighbor = game.board[nr][nc];
      if (!neighbor.isMine && neighbor.adjacent === 0) {
        queue.push([nr, nc]);
      }
    });
  }

  return size;
}

function revealInitialArea(game) {
  for (let r = 0; r < game.rows; r += 1) {
    for (let c = 0; c < game.cols; c += 1) {
      const cell = game.board[r][c];
      if (!cell.isMine && cell.adjacent === 0 && zeroRegionSize(game, r, c) >= MIN_SAFE_REGION_SIZE) {
        game.initialRevealCell = { row: r, col: c };
        revealFlood(game, r, c);
        return true;
      }
    }
  }
  return false;
}

function revealAnySafeCell(game) {
  for (let r = 0; r < game.rows; r += 1) {
    for (let c = 0; c < game.cols; c += 1) {
      if (!game.board[r][c].isMine) {
        game.initialRevealCell = { row: r, col: c };
        revealFlood(game, r, c);
        return;
      }
    }
  }
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

function flaggedNeighborCount(game, row, col) {
  return getNeighbors(game.rows, game.cols, row, col).filter(([nr, nc]) => game.board[nr][nc].isFlagged).length;
}

function revealDeducedSafeNeighbors(game, row, col, deductionQueue = []) {
  const cell = game.board[row][col];
  if (!cell.isRevealed || cell.isMine || cell.adjacent <= 0) {
    return;
  }
  if (flaggedNeighborCount(game, row, col) !== cell.adjacent) {
    return;
  }

  getNeighbors(game.rows, game.cols, row, col).forEach(([nr, nc]) => {
    const neighbor = game.board[nr][nc];
    if (!neighbor.isRevealed && !neighbor.isFlagged) {
      revealFlood(game, nr, nc);
      deductionQueue.push([nr, nc]);
    }
  });
}

function updateWinState(game) {
  const won = game.board.every((row) =>
    row.every((cell) => (cell.isMine ? cell.isFlagged : cell.isRevealed))
  );
  game.won = won;
  if (won) {
    game.gameOver = true;
  }
}

function revealAllCells(game) {
  for (let r = 0; r < game.rows; r += 1) {
    for (let c = 0; c < game.cols; c += 1) {
      const cell = game.board[r][c];
      cell.isRevealed = true;
      cell.isHidden = false;
    }
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
    game.explodedCell = { row, col, reason: 'mine' };
    revealAllCells(game);
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

  const deductionQueue = getNeighbors(game.rows, game.cols, row, col).filter(([nr, nc]) => {
    const neighbor = game.board[nr][nc];
    return neighbor.isRevealed && !neighbor.isMine;
  });

  cell.isFlagged = true;
  if (options.hideFlagged) {
    cell.isHidden = true;
  }
  if (!cell.isMine) {
    game.explodedCell = { row, col, reason: 'wrong-flag' };
    revealAllCells(game);
    game.gameOver = true;
    return;
  }

  getNeighbors(game.rows, game.cols, row, col).forEach(([nr, nc]) => {
    const neighbor = game.board[nr][nc];
    if (!neighbor.isMine && !neighbor.isRevealed && !neighbor.isFlagged) {
      neighbor.isRevealed = true;
      deductionQueue.push([nr, nc]);
    }
  });

  const processed = new Set();
  while (deductionQueue.length > 0) {
    const [nr, nc] = deductionQueue.shift();
    const key = `${nr},${nc}`;
    if (processed.has(key)) {
      continue;
    }
    processed.add(key);
    revealDeducedSafeNeighbors(game, nr, nc, deductionQueue);
  }

  updateWinState(game);
}
