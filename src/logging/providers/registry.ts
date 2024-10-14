import { Provider } from '../../microservice/provider';
import { Dependencies } from '../dependencies';
import { Logger } from '../logging';
/**
 * A registry of logging providers
 */
type ProviderRegistry = {
  [key: string]: Provider<Dependencies, Logger>;
};

const registry: ProviderRegistry = {};

/**
 * Registers an logging provider
 * @param name - The name of the provider
 * @param provider - The provider
 */
export const register = (name: string, provider: Provider<Dependencies, Logger>): void => {
  registry[name] = provider;
};

/**
 * Gets an HTTP provider
 * @param name - The name of the provider
 * @returns The provider
 */
export const get = (name: string): Provider<Dependencies, Logger> => {
  const provider = registry[name];
  if (!provider) {
    throw new Error(`Logging provider '${name}' not found`);
  }
  return provider;
};
