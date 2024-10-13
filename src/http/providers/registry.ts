import nodehttp from 'http';
import { Dependencies } from '../../dependencies';
import { HttpConfig } from '../config';

/**
 * A function that builds a server
 */
export type BuildServerFn = (dependencies: Dependencies) =>
(config: HttpConfig) => nodehttp.Server;

/**
 * A HTTP provider
 */
export type HttpProvider = {
  buildServer: BuildServerFn;
};

/**
 * A registry of HTTP providers
 */
type ProviderRegistry = {
  [key: string]: HttpProvider;
};

const registry: ProviderRegistry = {};

/**
 * Registers an HTTP provider
 * @param name - The name of the provider
 * @param provider - The provider
 */
export const register = (name: string, provider: HttpProvider): void => {
  registry[name] = provider;
};

/**
 * Gets an HTTP provider
 * @param name - The name of the provider
 * @returns The provider
 */
export const get = (name: string): HttpProvider => {
  const provider = registry[name];
  if (!provider) {
    throw new Error(`HTTP provider '${name}' not found`);
  }
  return provider;
};

/**
 * Builds a server
 * @param dependencies - The dependencies
 * @returns A function that builds a server
 */
export const buildServer = (dependencies: Dependencies) =>
  (config: HttpConfig) =>
    (providerName: string): nodehttp.Server => {
      const provider = get(providerName);
      return provider.buildServer(dependencies)(config);
    };

/**
 * Creates an HTTP provider
 * @param buildServerFn - The function that builds a server
 * @returns An HTTP provider
 */
export const createProvider = (buildServerFn: BuildServerFn): HttpProvider => {
  return { buildServer: buildServerFn };
};
