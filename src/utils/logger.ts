type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let currentLevel: LogLevel = 'debug';

export const logger = {
  setLevel(level: LogLevel) {
    currentLevel = level;
  },

  debug(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.log('', ...args);
    }
  },

  info(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.log('[eventiq]', ...args);
    }
  },

  warn(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn('[eventiq]', ...args);
    }
  },

  error(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
      console.error('[eventiq]', ...args);
    }
  },
};
