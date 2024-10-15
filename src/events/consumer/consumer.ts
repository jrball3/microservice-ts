/**
 * The event consumer
 */
export interface EventConsumer {
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
}
