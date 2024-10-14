export interface Provider<D, T> {
  resolve: (dependencies: D) => T;
}

