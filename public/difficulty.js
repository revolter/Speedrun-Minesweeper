const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: 'Easy', mineMultiplier: 0.75 },
  { key: 'normal', label: 'Normal', mineMultiplier: 1 },
  { key: 'hard', label: 'Hard', mineMultiplier: 1.35 }
];

const DIFFICULTY_OPTIONS_BY_KEY = new Map(DIFFICULTY_OPTIONS.map((option) => [option.key, option]));

const DEFAULT_DIFFICULTY_KEY = 'normal';

function difficultyConfigForKey(key) {
  return DIFFICULTY_OPTIONS_BY_KEY.get(key) || DIFFICULTY_OPTIONS_BY_KEY.get(DEFAULT_DIFFICULTY_KEY);
}

function mineCountForDifficulty(baseMines, totalCells, difficultyKey) {
  const config = difficultyConfigForKey(difficultyKey);
  const adjusted = Math.round(baseMines * config.mineMultiplier);
  return Math.max(1, Math.min(adjusted, totalCells - 1));
}

export { DIFFICULTY_OPTIONS, DEFAULT_DIFFICULTY_KEY, difficultyConfigForKey, mineCountForDifficulty };
