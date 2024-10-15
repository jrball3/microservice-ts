import { Provider } from './provider';

const depRegistry: Map<string, string[]> = new Map();

const setDependencies = (name: string, deps: string[]): void => {
  if (depRegistry.has(name)) {
    throw new Error(`Dependency ${name} already registered`);
  }
  depRegistry.set(name, deps);
};

const getDependencies = (name: string): string[] => {
  return depRegistry.get(name) ?? [];
};

const singletons: Map<string, unknown> = new Map();

const getSingleton = <T>(name: string): T | undefined => {
  return singletons.get(name) as T | undefined;
};

const setSingleton = <T>(name: string, value: T): void => {
  singletons.set(name, value);
};

const providers: Map<string, Provider<unknown, unknown>> = new Map();

const setProvider = <D, T>(name: string, provider: Provider<D, T>): void => {
  if (providers.has(name)) {
    throw new Error(`Provider ${name} already registered`);
  }
  providers.set(name, provider as Provider<unknown, unknown>);
};

const getProvider = <D, T>(name: string): Provider<D, T> | undefined => {
  return providers.get(name) as Provider<D, T> | undefined;
};

/**
 * Registers a provider in the dependency injection container.
 * @param name - The name of the dependency.
 * @param dependencies - The dependencies of the dependency.
 * @param provider - The provider of the dependency.
 */
export const register = <D, T, N extends string>(
  name: N,
  dependencies: (Exclude<keyof D & string, N>)[], 
  provider: Provider<D, T>,
): void => {
  setDependencies(name, dependencies);
  setProvider(name, provider as Provider<unknown, unknown>);
};

const resolveDependencies = async <D>(name: string): Promise<D> => {
  const depNames = getDependencies(name) as (keyof D & string)[];
  const deps = {} as Record<keyof D, unknown>;
  for (const depName of depNames) {
    const depProvider = getProvider(depName);
    if (!depProvider) {
      throw new Error(`Provider for dependency ${depName} not found`);
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    deps[depName] = await resolve(depName, depProvider);
  }
  return deps as D;
};

/**
 * Resolves a dependency from the dependency injection container.
 * @param name - The name of the dependency.
 * @param provider - The provider of the dependency.
 * @returns The resolved dependency.
 */
export const resolve = async <D, T>(name: string, provider: Provider<D, T>): Promise<T> => {
  const singleton = getSingleton<T>(name);
  if (!singleton) {
    const deps = await resolveDependencies<D>(name);
    const instance = await provider(deps);
    setSingleton(name, instance);
    return instance;
  }
  return singleton;
};
