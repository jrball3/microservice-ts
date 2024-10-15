/**
 * The event consumer
 */
export interface EventConsumer {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: () => Promise<void>;
}
