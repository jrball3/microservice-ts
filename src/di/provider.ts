/**
 * A provider for a dependency.
 */
export interface Provider<D, T> {
  (dependencies: D): T;
}
