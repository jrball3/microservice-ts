import { Provider } from '../../microservice/provider';
import { Dependencies } from '../dependencies';
import { HttpServer } from '../http-server';

/**
 * A registry of HTTP providers
 */
type ProviderRegistry = {
  [key: string]: Provider<Dependencies, HttpServer>;
};

const registry: ProviderRegistry = {};

/**
 * Registers an HTTP provider
 * @param name - The name of the provider
 * @param provider - The provider
 */
export const register = (name: string, provider: Provider<Dependencies, HttpServer>): void => {
  registry[name] = provider;
};

/**
 * Gets an HTTP provider
 * @param name - The name of the provider
 * @returns The provider
 */
export const get = (name: string): Provider<Dependencies, HttpServer> => {
  const provider = registry[name];
  if (!provider) {
    throw new Error(`HTTP provider '${name}' not found`);
  }
  return provider;
};
