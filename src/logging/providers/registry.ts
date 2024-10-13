import { Dependencies } from '../dependencies';
import * as logConfig from '../config';
import { Logger } from '../logging';
/**
 * A function that builds a logger
 */
export type BuildLoggerFn = (dependencies: Dependencies) =>
(config: logConfig.LoggingConfig) => Logger;

/**
 * A logging provider
 */
export type LoggingProvider = {
  buildLogger: BuildLoggerFn;
};

/**
 * A registry of logging providers
 */
type ProviderRegistry = {
  [key: string]: LoggingProvider;
};

const registry: ProviderRegistry = {};

/**
 * Registers an logging provider
 * @param name - The name of the provider
 * @param provider - The provider
 */
export const register = (name: string, provider: LoggingProvider): void => {
  registry[name] = provider;
};

/**
 * Gets an HTTP provider
 * @param name - The name of the provider
 * @returns The provider
 */
export const get = (name: string): LoggingProvider => {
  const provider = registry[name];
  if (!provider) {
    throw new Error(`Logging provider '${name}' not found`);
  }
  return provider;
};

/**
 * Builds a server
 * @param dependencies - The dependencies
 * @returns A function that builds a server
 */
export const buildLogger = (dependencies: Dependencies) =>
  (config: logConfig.LoggingConfig) =>
    (providerName: string): Logger => {
      const provider = get(providerName);
      return provider.buildLogger(dependencies)(config);
    };

/**
 * Creates a Logging provider
 * @param buildLoggerFn - The function that builds a logger
 * @returns A logging provider
 */
export const createProvider = (buildLoggerFn: BuildLoggerFn): LoggingProvider => {
  return { buildLogger: buildLoggerFn };
};
