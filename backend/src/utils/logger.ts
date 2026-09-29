/* eslint-disable no-console */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const activeLevel: Level = (process.env.LOG_LEVEL as Level) || 'info';
const silent = process.env.NODE_ENV === 'test' && process.env.LOG_LEVEL === undefined;

const emit = (level: Level, message: string, meta?: unknown): void => {
  if (silent || LEVELS[level] < LEVELS[activeLevel]) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta === undefined) sink(line);
  else sink(line, meta);
};

export const logger = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
