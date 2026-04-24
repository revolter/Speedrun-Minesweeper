import { createGame, revealCell, flagCell } from './game-logic.js';
import { createDebugTrace, recordDebugAction, serializeDebugTrace } from './debug-trace.js';
import { displayedAdjacentValue } from './adjacent-display.js';
import { BOARD_SIZE_OPTIONS, DEFAULT_BOARD_SIZE_KEY, boardSizeConfigForKey } from './board-size.js';
import {
  DIFFICULTY_OPTIONS,
  DEFAULT_DIFFICULTY_KEY,
  difficultyConfigForKey,
  mineCountForDifficulty
} from './difficulty.js';

const LONG_PRESS_MS = 380;
const COPY_FEEDBACK_DURATION_MS = 1200;
const APP_VERSION = '2026.04.24.3';

const prefs = {
  hideFlagged: true,
  swapPressActions: true,
  boardSize: DEFAULT_BOARD_SIZE_KEY,
  difficulty: DEFAULT_DIFFICULTY_KEY
};

const els = {
  board: document.querySelector('#board'),
  status: document.querySelector('#status'),
  hideFlagged: document.querySelector('#hideFlagged'),
  swapPressActions: document.querySelector('#swapPressActions'),
  boardSize: document.querySelector('#boardSize'),
  difficulty: document.querySelector('#difficulty'),
  newGame: document.querySelector('#newGame'),
  copyDebug: document.querySelector('#copyDebug'),
  version: document.querySelector('#version')
};

for (const option of BOARD_SIZE_OPTIONS) {
  const el = document.createElement('option');
  el.value = option.key;
  el.textContent = option.label;
  els.boardSize.appendChild(el);
}

for (const option of DIFFICULTY_OPTIONS) {
  const el = document.createElement('option');
  el.value = option.key;
  el.textContent = option.label;
  els.difficulty.appendChild(el);
}

function currentBoardConfig() {
  const board = boardSizeConfigForKey(prefs.boardSize);
  const mines = mineCountForDifficulty(board.mines, board.rows * board.cols, prefs.difficulty);
  return { ...board, mines };
}

let game;
let debugTrace = null;
let pressTimer = null;
let longPressTriggered = false;
let copyButtonResetTimer = null;
const hiddenFlagAnimationsPlayed = new Set();

function cellKey(row, col) {
  return `${row},${col}`;
}

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('speedrun-minesweeper-prefs') || '{}');
    prefs.hideFlagged = typeof saved.hideFlagged === 'boolean' ? saved.hideFlagged : true;
    prefs.swapPressActions =
      typeof saved.swapPressActions === 'boolean' ? saved.swapPressActions : true;
    prefs.boardSize = boardSizeConfigForKey(saved.boardSize).key;
    prefs.difficulty = difficultyConfigForKey(saved.difficulty).key;
  } catch {
    prefs.hideFlagged = true;
    prefs.swapPressActions = true;
    prefs.boardSize = DEFAULT_BOARD_SIZE_KEY;
    prefs.difficulty = DEFAULT_DIFFICULTY_KEY;
  }

  els.hideFlagged.checked = prefs.hideFlagged;
  els.swapPressActions.checked = prefs.swapPressActions;
  els.boardSize.value = prefs.boardSize;
  els.difficulty.value = prefs.difficulty;
}

function savePreferences() {
  localStorage.setItem('speedrun-minesweeper-prefs', JSON.stringify(prefs));
}

function displayedAdjacent(row, col, cell) {
  const neighbors = [
    game.board[row - 1]?.[col - 1],
    game.board[row - 1]?.[col],
    game.board[row - 1]?.[col + 1],
    game.board[row]?.[col - 1],
    game.board[row]?.[col + 1],
    game.board[row + 1]?.[col - 1],
    game.board[row + 1]?.[col],
    game.board[row + 1]?.[col + 1]
  ];
  return displayedAdjacentValue(cell, neighbors, prefs.hideFlagged);
}

function displayedAdjacentForSnapshot(row, col, cell, hideFlagged) {
  const neighbors = [
    game.board[row - 1]?.[col - 1],
    game.board[row - 1]?.[col],
    game.board[row - 1]?.[col + 1],
    game.board[row]?.[col - 1],
    game.board[row]?.[col + 1],
    game.board[row + 1]?.[col - 1],
    game.board[row + 1]?.[col],
    game.board[row + 1]?.[col + 1]
  ];
  return displayedAdjacentValue(cell, neighbors, hideFlagged);
}

function hiddenCellDisplayValue(row, col) {
  const neighbors = [
    game.board[row - 1]?.[col - 1],
    game.board[row - 1]?.[col],
    game.board[row - 1]?.[col + 1],
    game.board[row]?.[col - 1],
    game.board[row]?.[col + 1],
    game.board[row + 1]?.[col - 1],
    game.board[row + 1]?.[col],
    game.board[row + 1]?.[col + 1]
  ];
  const adjacentMines = neighbors.filter((n) => n?.isMine).length;
  const hiddenFlaggedNeighbors = neighbors.filter((n) => n?.isFlagged && n?.isMine).length;
  return Math.max(0, adjacentMines - hiddenFlaggedNeighbors);
}

function snapshotChar(row, col, hideFlagged, showHiddenFlagAsFlag = false) {
  const cell = game.board[row][col];
  if (!cell.isRevealed) {
    if (!cell.isFlagged) {
      return '?';
    }
    if (showHiddenFlagAsFlag || !hideFlagged) {
      return 'F';
    }
    return String(hiddenCellDisplayValue(row, col));
  }
  if (cell.isMine) {
    return 'M';
  }
  return String(displayedAdjacentForSnapshot(row, col, cell, hideFlagged));
}

function captureVisibleSnapshot({ hideFlagged, showHiddenFlagAsFlag = false }) {
  const rows = [];
  for (let r = 0; r < game.rows; r += 1) {
    let rowText = '';
    for (let c = 0; c < game.cols; c += 1) {
      rowText += snapshotChar(r, c, hideFlagged, showHiddenFlagAsFlag);
    }
    rows.push(rowText);
  }
  return rows;
}

function cellLabel(row, col, cell) {
  if (
    game.gameOver &&
    !game.won &&
    game.explodedCell?.row === row &&
    game.explodedCell?.col === col
  ) {
    return game.explodedCell.reason === 'mine' ? '💥' : '❌';
  }

  if (!cell.isRevealed) {
    if (cell.isHidden) {
      const value = hiddenCellDisplayValue(row, col);
      return value > 0 ? String(value) : '';
    }
    if (cell.isFlagged) {
      return '🚩';
    }
    return '';
  }

  if (cell.isMine) {
    return '💣';
  }

  const adjacent = displayedAdjacent(row, col, cell);
  return adjacent > 0 ? String(adjacent) : '';
}

function statusLabel() {
  if (game.won) {
    return 'You won! 🎉';
  }
  if (game.gameOver) {
    return 'Game over 💀';
  }
  return 'Speedrun mode: flagging is permanent and auto-reveals nearby safe cells.';
}

function captureCellState(row, col) {
  const cell = game.board[row]?.[col];
  if (!cell) {
    return null;
  }

  return {
    isRevealed: cell.isRevealed,
    isFlagged: cell.isFlagged,
    isHidden: cell.isHidden,
    gameOver: game.gameOver,
    won: game.won
  };
}

function hasCellStateChanged(before, after) {
  if (!before || !after) {
    return before !== after;
  }

  return (
    before.isRevealed !== after.isRevealed ||
    before.isFlagged !== after.isFlagged ||
    before.isHidden !== after.isHidden ||
    before.gameOver !== after.gameOver ||
    before.won !== after.won
  );
}

function setHiddenStateForFlaggedCells(hidden) {
  for (let r = 0; r < game.rows; r += 1) {
    for (let c = 0; c < game.cols; c += 1) {
      const cell = game.board[r][c];
      if (cell.isFlagged) {
        cell.isHidden = hidden;
      }
    }
  }
}

function initializeDebugTrace() {
  debugTrace = createDebugTrace(game, {
    appVersion: APP_VERSION,
    hideFlagged: prefs.hideFlagged,
    initialSnapshot: captureVisibleSnapshot({ hideFlagged: prefs.hideFlagged })
  });
}

function revealHiddenFlagZeroCells() {
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < game.rows; r += 1) {
      for (let c = 0; c < game.cols; c += 1) {
        const cell = game.board[r][c];
        if (!cell.isRevealed || cell.isMine) {
          continue;
        }
        if (displayedAdjacent(r, c, cell) !== 0) {
          continue;
        }
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) {
              continue;
            }
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= game.rows || nc < 0 || nc >= game.cols) {
              continue;
            }
            const neighbor = game.board[nr][nc];
            if (!neighbor.isRevealed && !neighbor.isFlagged) {
              revealCell(game, nr, nc);
              changed = true;
            }
          }
        }
      }
    }
  }
}

function handleAction(row, col, actionType) {
  const before = captureCellState(row, col);

  if (actionType === 'reveal') {
    revealCell(game, row, col);
  } else {
    flagCell(game, row, col, { hideFlagged: prefs.hideFlagged });
  }

  const after = captureCellState(row, col);
  if (!hasCellStateChanged(before, after)) {
    render();
    return;
  }

  if (actionType === 'flag' && prefs.hideFlagged) {
    recordDebugAction(
      debugTrace,
      actionType,
      row,
      col,
      captureVisibleSnapshot({ hideFlagged: false, showHiddenFlagAsFlag: true })
    );
    revealHiddenFlagZeroCells();
    recordDebugAction(debugTrace, 'hide-flag', row, col, captureVisibleSnapshot({ hideFlagged: true }));
  } else {
    recordDebugAction(
      debugTrace,
      actionType,
      row,
      col,
      captureVisibleSnapshot({ hideFlagged: prefs.hideFlagged })
    );
  }

  render();
}

function actionForPress(kind) {
  if (!prefs.swapPressActions) {
    return kind === 'short' ? 'reveal' : 'flag';
  }
  return kind === 'short' ? 'flag' : 'reveal';
}

function beginPress(row, col, event, isTouch = false) {
  if (isTouch) {
    event.preventDefault();
  }
  longPressTriggered = false;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    longPressTriggered = true;
    handleAction(row, col, actionForPress('long'));
  }, LONG_PRESS_MS);
}

function endPress(row, col, event, isTouch = false) {
  if (isTouch) {
    event.preventDefault();
  }
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
  if (!longPressTriggered) {
    handleAction(row, col, actionForPress('short'));
  }
}

function cancelPress() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
  longPressTriggered = false;
}

function render() {
  els.board.innerHTML = '';
  els.board.style.gridTemplateColumns = `repeat(${game.cols}, 1fr)`;

  for (let r = 0; r < game.rows; r += 1) {
    for (let c = 0; c < game.cols; c += 1) {
      const cell = game.board[r][c];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.textContent = cellLabel(r, c, cell);
      button.ariaLabel = `Cell ${r + 1},${c + 1}`;

      if (cell.isRevealed) {
        button.classList.add('revealed');
      }
      if (cell.isMine && cell.isRevealed) {
        button.classList.add('mine');
      }
      if (cell.isFlagged && !cell.isHidden) {
        button.classList.add('flagged');
      }
      if (cell.isHidden) {
        button.classList.add('hidden');
        if (cell.isFlagged) {
          const key = cellKey(r, c);
          if (!hiddenFlagAnimationsPlayed.has(key)) {
            button.classList.add('hidden-flag-enter');
            hiddenFlagAnimationsPlayed.add(key);
          }
        }
      } else {
        hiddenFlagAnimationsPlayed.delete(cellKey(r, c));
      }

      button.addEventListener('mousedown', (event) => {
        if (event.button === 0) {
          beginPress(r, c, event);
        }
      });
      button.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
          endPress(r, c, event);
        }
      });
      button.addEventListener('mouseleave', cancelPress);
      button.addEventListener('touchstart', (event) => beginPress(r, c, event, true), {
        passive: false
      });
      button.addEventListener('touchend', (event) => endPress(r, c, event, true), {
        passive: false
      });
      button.addEventListener('touchcancel', cancelPress, { passive: true });
      button.addEventListener('touchmove', cancelPress, { passive: true });
      button.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        cancelPress();
        handleAction(r, c, actionForPress('long'));
      });

      els.board.appendChild(button);
    }
  }

  els.status.textContent = statusLabel();
  els.status.className = game.won ? 'won' : game.gameOver ? 'game-over' : '';
  els.version.textContent = `build ${APP_VERSION}`;
}

function resetGame() {
  const boardConfig = currentBoardConfig();
  game = createGame(boardConfig.rows, boardConfig.cols, boardConfig.mines);
  hiddenFlagAnimationsPlayed.clear();
  render();
  initializeDebugTrace();
}

async function copyDebugTrace() {
  const payload = serializeDebugTrace(debugTrace);
  try {
    await navigator.clipboard.writeText(payload);
    els.copyDebug.textContent = 'Copied!';
  } catch {
    els.copyDebug.textContent = 'Copy failed';
  }
  if (copyButtonResetTimer) {
    clearTimeout(copyButtonResetTimer);
  }
  copyButtonResetTimer = setTimeout(() => {
    els.copyDebug.textContent = 'Copy debug trace';
    copyButtonResetTimer = null;
  }, COPY_FEEDBACK_DURATION_MS);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // non-fatal
    });
  }
}

els.hideFlagged.addEventListener('change', () => {
  prefs.hideFlagged = els.hideFlagged.checked;
  debugTrace.hideFlaggedCells = prefs.hideFlagged;
  setHiddenStateForFlaggedCells(prefs.hideFlagged);
  savePreferences();
  render();
});

els.swapPressActions.addEventListener('change', () => {
  prefs.swapPressActions = els.swapPressActions.checked;
  savePreferences();
});

els.boardSize.addEventListener('change', () => {
  prefs.boardSize = boardSizeConfigForKey(els.boardSize.value).key;
  savePreferences();
  resetGame();
});

els.difficulty.addEventListener('change', () => {
  prefs.difficulty = difficultyConfigForKey(els.difficulty.value).key;
  savePreferences();
  resetGame();
});

els.newGame.addEventListener('click', resetGame);
els.copyDebug.addEventListener('click', copyDebugTrace);

loadPreferences();
resetGame();
registerServiceWorker();
