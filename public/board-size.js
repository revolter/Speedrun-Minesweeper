const BOARD_SIZE_OPTIONS = [
  { key: 'small', label: 'Small (9×9)', rows: 9, cols: 9, mines: 10 },
  { key: 'medium', label: 'Medium (12×12)', rows: 12, cols: 12, mines: 24 },
  { key: 'large', label: 'Large (16×16)', rows: 16, cols: 16, mines: 40 }
];

const BOARD_SIZE_OPTIONS_BY_KEY = new Map(BOARD_SIZE_OPTIONS.map((option) => [option.key, option]));

const DEFAULT_BOARD_SIZE_KEY = 'small';

function boardSizeConfigForKey(key) {
  return BOARD_SIZE_OPTIONS_BY_KEY.get(key) || BOARD_SIZE_OPTIONS_BY_KEY.get(DEFAULT_BOARD_SIZE_KEY);
}

export { BOARD_SIZE_OPTIONS, DEFAULT_BOARD_SIZE_KEY, boardSizeConfigForKey };
