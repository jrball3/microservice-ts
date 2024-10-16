import * as logging from '../logging';
import { Event } from './event';
import { EventSeverity } from './event-severity';

/**
 * Logs an event
 * @param logger - The logger
 * @param logLevel - The log level
 * @param event - The event
 */
export const logEvent = (logger: logging.Logger) =>
  (event: Event): void => {
    const logMessage = JSON.stringify(event);
    const logFn = logger.log.bind(logger);
    let logLevel: logging.LogLevel;
    switch (event.eventSeverity) {
      case EventSeverity.ERROR:
        logLevel = logging.LogLevel.ERROR;
        break;
      case EventSeverity.WARN:
        logLevel = logging.LogLevel.WARN;
        break;
      case EventSeverity.INFO:
        logLevel = logging.LogLevel.INFO;
        break;
      case EventSeverity.DEBUG:
        logLevel = logging.LogLevel.DEBUG;
        break;
      case EventSeverity.TRACE:
        logLevel = logging.LogLevel.TRACE;
        break;
    }
    logFn(logLevel, logMessage);
  };
