import { createGame, revealCell, flagCell } from './game-logic.js';
import { createDebugTrace, recordDebugAction, serializeDebugTrace } from './debug-trace.js';

const BOARD_ROWS = 9;
const BOARD_COLS = 9;
const BOARD_MINES = 10;
const LONG_PRESS_MS = 380;
const COPY_FEEDBACK_DURATION_MS = 1200;
const APP_VERSION = '2026.04.21.3';

const prefs = {
  hideFlagged: true,
  swapPressActions: true
};

const els = {
  board: document.querySelector('#board'),
  status: document.querySelector('#status'),
  hideFlagged: document.querySelector('#hideFlagged'),
  swapPressActions: document.querySelector('#swapPressActions'),
  newGame: document.querySelector('#newGame'),
  copyDebug: document.querySelector('#copyDebug'),
  version: document.querySelector('#version')
};

let game = createGame(BOARD_ROWS, BOARD_COLS, BOARD_MINES);
let debugTrace = createDebugTrace(game);
let pressTimer = null;
let longPressTriggered = false;
let copyButtonResetTimer = null;

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('speedrun-minesweeper-prefs') || '{}');
    prefs.hideFlagged = typeof saved.hideFlagged === 'boolean' ? saved.hideFlagged : true;
    prefs.swapPressActions =
      typeof saved.swapPressActions === 'boolean' ? saved.swapPressActions : true;
  } catch {
    prefs.hideFlagged = true;
    prefs.swapPressActions = true;
  }

  els.hideFlagged.checked = prefs.hideFlagged;
  els.swapPressActions.checked = prefs.swapPressActions;
}

function savePreferences() {
  localStorage.setItem('speedrun-minesweeper-prefs', JSON.stringify(prefs));
}

function displayedAdjacent(row, col, cell) {
  if (!prefs.hideFlagged || !cell.isRevealed || cell.isMine) {
    return cell.adjacent;
  }

  let adjusted = cell.adjacent;
  const neighbors = [
    [row - 1, col - 1],
    [row - 1, col],
    [row - 1, col + 1],
    [row, col - 1],
    [row, col + 1],
    [row + 1, col - 1],
    [row + 1, col],
    [row + 1, col + 1]
  ];

  neighbors.forEach(([nr, nc]) => {
    const neighbor = game.board[nr]?.[nc];
    if (neighbor?.isFlagged && neighbor.isHidden) {
      adjusted -= 1;
    }
  });

  return Math.max(0, adjusted);
}

function cellLabel(row, col, cell) {
  if (!cell.isRevealed) {
    if (cell.isHidden) {
      return '';
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
    return 'You won!';
  }
  if (game.gameOver) {
    return 'Game over';
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

function handleAction(row, col, actionType) {
  const before = captureCellState(row, col);

  if (actionType === 'reveal') {
    revealCell(game, row, col);
  } else {
    flagCell(game, row, col, { hideFlagged: prefs.hideFlagged });
  }

  const after = captureCellState(row, col);
  if (hasCellStateChanged(before, after)) {
    recordDebugAction(debugTrace, actionType, row, col);
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
  els.version.textContent = `build ${APP_VERSION}`;
}

function resetGame() {
  game = createGame(BOARD_ROWS, BOARD_COLS, BOARD_MINES);
  debugTrace = createDebugTrace(game);
  render();
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
  savePreferences();
});

els.swapPressActions.addEventListener('change', () => {
  prefs.swapPressActions = els.swapPressActions.checked;
  savePreferences();
});

els.newGame.addEventListener('click', resetGame);
els.copyDebug.addEventListener('click', copyDebugTrace);

loadPreferences();
render();
registerServiceWorker();
