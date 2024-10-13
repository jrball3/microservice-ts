import { Logger, LogLevel } from "./logger";
import * as events from "../events";

export type EventLogger = {
  log: (logLevel: LogLevel, event: events.Event) => void;
}

export const build = (logger: Logger): EventLogger => ({
  log: (logLevel, event) => {
    const eventData = { ...event, logLevel };
    const logMessage = JSON.stringify(eventData);
    const logFn = logger[logLevel];
    logFn.bind(logger)(logMessage);
  },
});
