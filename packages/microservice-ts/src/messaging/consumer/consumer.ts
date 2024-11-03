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
   * Checks if the event consumer is connected
   * @returns A boolean indicating whether the consumer is connected
   */
  isConnected: () => boolean;
  /**
   * Checks if the event consumer is running
   * @returns A boolean indicating whether the consumer is running
   */
  isRunning: () => boolean;
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
