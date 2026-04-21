const MAX_INITIAL_REVEAL_ATTEMPTS = 200;
const MIN_SAFE_REGION_SIZE = 2;

export function createGame(rows = 9, cols = 9, mineCount = 10, rng = Math.random) {
  const total = rows * cols;
  const mines = Math.max(1, Math.min(mineCount, total - 1));
  let game = null;
  let revealed = false;
  let attempts = 0;

  while (!revealed && attempts < MAX_INITIAL_REVEAL_ATTEMPTS) {
    game = buildGame(rows, cols, mines, rng);
    revealed = revealInitialArea(game);
    attempts += 1;
  }

  if (!revealed) {
    revealAnySafeCell(game);
  }

  return game;
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

function revealGuaranteedSafeCellsPass(game) {
  const frontierKeys = new Set();
  const constraints = [];

  for (let r = 0; r < game.rows; r += 1) {
    for (let c = 0; c < game.cols; c += 1) {
      const cell = game.board[r][c];
      if (!cell.isRevealed || cell.isMine || cell.adjacent === 0) {
        continue;
      }

      let flaggedCount = 0;
      const unknownKeys = [];
      getNeighbors(game.rows, game.cols, r, c).forEach(([nr, nc]) => {
        const neighbor = game.board[nr][nc];
        if (neighbor.isFlagged) {
          flaggedCount += 1;
        } else if (!neighbor.isRevealed) {
          const key = `${nr},${nc}`;
          unknownKeys.push(key);
          frontierKeys.add(key);
        }
      });

      const minesRequired = cell.adjacent - flaggedCount;
      if (minesRequired < 0 || minesRequired > unknownKeys.length) {
        return false;
      }
      if (unknownKeys.length > 0) {
        constraints.push({ keys: unknownKeys, minesRequired });
      }
    }
  }

  if (frontierKeys.size === 0 || constraints.length === 0) {
    return false;
  }

  const frontier = Array.from(frontierKeys);
  const frontierIndex = new Map(frontier.map((key, index) => [key, index]));
  const normalizedConstraints = constraints.map((constraint) => ({
    vars: Array.from(new Set(constraint.keys.map((key) => frontierIndex.get(key)))),
    minesRequired: constraint.minesRequired
  }));

  const varToConstraints = Array.from({ length: frontier.length }, () => []);
  normalizedConstraints.forEach((constraint, constraintIndex) => {
    constraint.vars.forEach((varIndex) => {
      varToConstraints[varIndex].push(constraintIndex);
    });
  });

  const visited = new Set();
  const guaranteedSafeVars = new Set();

  for (let startVar = 0; startVar < frontier.length; startVar += 1) {
    if (visited.has(startVar)) {
      continue;
    }

    const stack = [startVar];
    const componentVars = [];
    const componentConstraints = new Set();

    while (stack.length > 0) {
      const varIndex = stack.pop();
      if (visited.has(varIndex)) {
        continue;
      }
      visited.add(varIndex);
      componentVars.push(varIndex);

      varToConstraints[varIndex].forEach((constraintIndex) => {
        componentConstraints.add(constraintIndex);
        normalizedConstraints[constraintIndex].vars.forEach((nextVar) => {
          if (!visited.has(nextVar)) {
            stack.push(nextVar);
          }
        });
      });
    }

    const vars = componentVars;
    const constraintsForComponent = Array.from(componentConstraints).map(
      (constraintIndex) => normalizedConstraints[constraintIndex]
    );
    const assignment = new Map();
    const mineCounts = new Map(vars.map((varIndex) => [varIndex, 0]));
    let solutions = 0;

    function isFeasible() {
      for (const constraint of constraintsForComponent) {
        let assignedMines = 0;
        let unknown = 0;
        for (const varIndex of constraint.vars) {
          const value = assignment.get(varIndex);
          if (value === undefined) {
            unknown += 1;
          } else if (value) {
            assignedMines += 1;
          }
        }
        if (assignedMines > constraint.minesRequired) {
          return false;
        }
        if (assignedMines + unknown < constraint.minesRequired) {
          return false;
        }
      }
      return true;
    }

    function backtrack(position) {
      if (position === vars.length) {
        solutions += 1;
        vars.forEach((varIndex) => {
          if (assignment.get(varIndex)) {
            mineCounts.set(varIndex, mineCounts.get(varIndex) + 1);
          }
        });
        return;
      }

      const varIndex = vars[position];
      assignment.set(varIndex, false);
      if (isFeasible()) {
        backtrack(position + 1);
      }

      assignment.set(varIndex, true);
      if (isFeasible()) {
        backtrack(position + 1);
      }

      assignment.delete(varIndex);
    }

    backtrack(0);
    if (solutions === 0) {
      return false;
    }

    vars.forEach((varIndex) => {
      if (mineCounts.get(varIndex) === 0) {
        guaranteedSafeVars.add(varIndex);
      }
    });
  }

  let changed = false;
  guaranteedSafeVars.forEach((varIndex) => {
    const [row, col] = frontier[varIndex].split(',').map(Number);
    const cell = game.board[row][col];
    if (!cell.isRevealed && !cell.isFlagged) {
      const before = cell.isRevealed;
      revealFlood(game, row, col);
      if (!before) {
        changed = true;
      }
    }
  });

  return changed;
}

function revealGuaranteedSafeCells(game) {
  let changed = false;
  let passChanged = true;
  while (passChanged && !game.gameOver) {
    passChanged = revealGuaranteedSafeCellsPass(game);
    changed = changed || passChanged;
  }
  return changed;
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
  if (options.hideFlagged) {
    cell.isHidden = true;
  }
  if (!cell.isMine) {
    cell.isHidden = false;
    game.gameOver = true;
    return;
  }

  getNeighbors(game.rows, game.cols, row, col).forEach(([nr, nc]) => {
    const neighbor = game.board[nr][nc];
    if (!neighbor.isMine) {
      revealFlood(game, nr, nc);
    }
  });
  revealGuaranteedSafeCells(game);

  updateWinState(game);
}
