/**
 * A provider for a dependency.
 */
export type Provider<D, T> = (dependencies: D) => T;
