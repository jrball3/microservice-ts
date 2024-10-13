import { Logger, LogLevel } from "./logging";
import * as events from "../events";

/**
 * Logs an event
 * @param logger - The logger
 * @param logLevel - The log level
 * @param event - The event
 */
export const logEvent = (logger: Logger) => (logLevel: LogLevel, event: events.Event): void => {
  const eventData = { ...event, logLevel };
  const logMessage = JSON.stringify(eventData);
  const logFn = logger[logLevel];
  logFn.bind(logger)(logMessage);
}
