/**
 * The event consumer
 */
export interface EventConsumer {
  /**
   * Connects to the event consumer
   * @returns A promise that resolves to a boolean indicating whether the connection was successful
   */ 
  connect: () => Promise<boolean>;
  /**
   * Disconnects from the event consumer
   * @returns A promise that resolves to a boolean indicating whether the disconnection was successful
   */
  disconnect: () => Promise<boolean>;
  /**
   * Starts the event consumer
   * @returns A promise that resolves to a boolean indicating whether the start was successful
   */
  start: () => Promise<boolean>;
  /**
   * Stops the event consumer
   * @returns A promise that resolves to a boolean indicating whether the stop was successful
   */
  stop: () => Promise<boolean>;
}
