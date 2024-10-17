import { Provider } from '../../di/provider';
import * as logConfig from '../config';
import { Dependencies } from '../dependencies';
import { Logger, LogLevel } from '../logging';

const shouldLog = (logLevel: LogLevel, configLevel: LogLevel): boolean => {
  const logLevels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
  return logLevels.indexOf(logLevel) <= logLevels.indexOf(configLevel);
};

/**
 * Builds a logger
 * @param dependencies - The dependencies
 * @returns A logger
 */
const buildLogger = (_dependencies: Dependencies) =>
  (config: logConfig.LoggingConfig): Logger => {
    const info = (message: string): void => {
      if (shouldLog(LogLevel.INFO, config.level)) {
        console.log(message);
      }
    };
    const error = (message: string): void => {
      if (shouldLog(LogLevel.ERROR, config.level)) {
        console.error(message);
      }
    };
    const warn = (message: string): void => {
      if (shouldLog(LogLevel.WARN, config.level)) {
        console.warn(message);
      }
    };
    const debug = (message: string): void => {
      if (shouldLog(LogLevel.DEBUG, config.level)) {
        console.debug(message);
      }
    };
    const trace = (message: string): void => {
      if (shouldLog(LogLevel.TRACE, config.level)) {
        console.trace(message);
      }
    };
    const log = (logLevel: LogLevel, message: string): void => {
      switch (logLevel) {
        case LogLevel.INFO: info(message); break;
        case LogLevel.ERROR: error(message); break;
        case LogLevel.WARN: warn(message); break;
        case LogLevel.DEBUG: debug(message); break;
        case LogLevel.TRACE: trace(message); break;
        default: break;
      }
    };
    return {
      log,
      info,
      error,
      warn,
      debug,
      trace,
    };
  };

/**
 * Creates a logging provider
 * @param buildLoggerFn - The build logger function
 * @returns A logging provider
 */
export const createProvider = (
  config: logConfig.LoggingConfig,
): Provider<Dependencies, Logger> =>
  (dependencies: Dependencies) => buildLogger(dependencies)(config);
