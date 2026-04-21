import { createGame, revealCell, flagCell } from './game-logic.js';

const BOARD_ROWS = 9;
const BOARD_COLS = 9;
const BOARD_MINES = 10;
const LONG_PRESS_MS = 380;

const prefs = {
  fadeFlagged: false,
  swapPressActions: false
};

const els = {
  board: document.querySelector('#board'),
  status: document.querySelector('#status'),
  fadeFlagged: document.querySelector('#fadeFlagged'),
  swapPressActions: document.querySelector('#swapPressActions'),
  newGame: document.querySelector('#newGame')
};

let game = createGame(BOARD_ROWS, BOARD_COLS, BOARD_MINES);
let pressTimer = null;
let longPressTriggered = false;

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('speedrun-minesweeper-prefs') || '{}');
    prefs.fadeFlagged = Boolean(saved.fadeFlagged);
    prefs.swapPressActions = Boolean(saved.swapPressActions);
  } catch {
    prefs.fadeFlagged = false;
    prefs.swapPressActions = false;
  }

  els.fadeFlagged.checked = prefs.fadeFlagged;
  els.swapPressActions.checked = prefs.swapPressActions;
}

function savePreferences() {
  localStorage.setItem('speedrun-minesweeper-prefs', JSON.stringify(prefs));
}

function cellLabel(cell) {
  if (!cell.isRevealed) {
    if (cell.isFlagged) {
      return '🚩';
    }
    return '';
  }

  if (cell.isMine) {
    return '💣';
  }

  return cell.adjacent > 0 ? String(cell.adjacent) : '';
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

function handleAction(row, col, actionType) {
  if (actionType === 'reveal') {
    revealCell(game, row, col);
  } else {
    flagCell(game, row, col, { fadeFlagged: prefs.fadeFlagged });
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
      button.textContent = cellLabel(cell);
      button.ariaLabel = `Cell ${r + 1},${c + 1}`;

      if (cell.isRevealed) {
        button.classList.add('revealed');
      }
      if (cell.isMine && cell.isRevealed) {
        button.classList.add('mine');
      }
      if (cell.isFlagged) {
        button.classList.add('flagged');
      }
      if (cell.isFaded) {
        button.classList.add('faded');
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
}

function resetGame() {
  game = createGame(BOARD_ROWS, BOARD_COLS, BOARD_MINES);
  render();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // non-fatal
    });
  }
}

els.fadeFlagged.addEventListener('change', () => {
  prefs.fadeFlagged = els.fadeFlagged.checked;
  savePreferences();
});

els.swapPressActions.addEventListener('change', () => {
  prefs.swapPressActions = els.swapPressActions.checked;
  savePreferences();
});

els.newGame.addEventListener('click', resetGame);

loadPreferences();
render();
registerServiceWorker();
