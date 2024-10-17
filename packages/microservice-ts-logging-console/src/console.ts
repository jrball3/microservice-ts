import { di, logging } from '@jrball3/microservice-ts';

const shouldLog = (logLevel: logging.LogLevel, configLevel: logging.LogLevel): boolean => {
  const logLevels = [logging.LogLevel.ERROR, logging.LogLevel.WARN, logging.LogLevel.INFO, logging.LogLevel.DEBUG, logging.LogLevel.TRACE];
  return logLevels.indexOf(logLevel) <= logLevels.indexOf(configLevel);
};

/**
 * Builds a logger
 * @param dependencies - The dependencies
 * @returns A logger
 */
const buildLogger = (_dependencies: logging.Dependencies) =>
  (config: logging.config.LoggingConfig): logging.Logger => {
    const info = (message: string): void => {
      if (shouldLog(logging.LogLevel.INFO, config.level)) {
        console.log(message);
      }
    };
    const error = (message: string): void => {
      if (shouldLog(logging.LogLevel.ERROR, config.level)) {
        console.error(message);
      }
    };
    const warn = (message: string): void => {
      if (shouldLog(logging.LogLevel.WARN, config.level)) {
        console.warn(message);
      }
    };
    const debug = (message: string): void => {
      if (shouldLog(logging.LogLevel.DEBUG, config.level)) {
        console.debug(message);
      }
    };
    const trace = (message: string): void => {
      if (shouldLog(logging.LogLevel.TRACE, config.level)) {
        console.trace(message);
      }
    };
    const log = (logLevel: logging.LogLevel, message: string): void => {
      switch (logLevel) {
        case logging.LogLevel.INFO: info(message); break;
        case logging.LogLevel.ERROR: error(message); break;
        case logging.LogLevel.WARN: warn(message); break;
        case logging.LogLevel.DEBUG: debug(message); break;
        case logging.LogLevel.TRACE: trace(message); break;
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
  config: logging.config.LoggingConfig,
): di.Provider<logging.Dependencies, logging.Logger> =>
  (dependencies: logging.Dependencies) => buildLogger(dependencies)(config);
