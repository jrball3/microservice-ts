import * as logging from '../logging';

export enum EventSeverity {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

/**
 * Converts a log level to an event severity
 * @param logLevel - The log level
 * @returns - The event severity
 */
export const fromLogLevel = (logLevel: logging.LogLevel): EventSeverity => {
  switch (logLevel) {
    case logging.LogLevel.ERROR:
      return EventSeverity.ERROR;
    case logging.LogLevel.WARN:
      return EventSeverity.WARN;
    case logging.LogLevel.DEBUG:
      return EventSeverity.DEBUG;
    case logging.LogLevel.TRACE:
      return EventSeverity.TRACE;
    default:
      return EventSeverity.INFO;
  }
};

/**
 * Converts an event severity to a log level
 * @param eventSeverity - The event severity
 * @returns - The log level
 */
export const toLogLevel = (eventSeverity: EventSeverity): logging.LogLevel => {
  switch (eventSeverity) {
    case EventSeverity.ERROR:
      return logging.LogLevel.ERROR;
    case EventSeverity.WARN:
      return logging.LogLevel.WARN;
    case EventSeverity.DEBUG:
      return logging.LogLevel.DEBUG;
    case EventSeverity.TRACE:
      return logging.LogLevel.TRACE;
    default:
      return logging.LogLevel.INFO;
  }
};
