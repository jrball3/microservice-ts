/**
 * A log level
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

/**
 * A logger
 */
export type Logger = {
  log: (logLevel: LogLevel, message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  debug: (message: string) => void;
  trace: (message: string) => void;
};
