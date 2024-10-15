/**
 * The producer options
 */
export type ProducerOptions = {
  key?: string;
  acks?: number;
  timeout?: number;
};

/**
 * The producer result
 */
export type ProducerResult = {
  success: boolean;
  messageId?: string;
  errorCode?: number;
};

export type EventProducer = {
  /**
   * Connects to the event producer
   * @returns A promise that resolves to a boolean indicating whether the connection was successful
   */ 
  connect: () => Promise<boolean>;
  /**
   * Disconnects from the event producer
   * @returns A promise that resolves to a boolean indicating whether the disconnection was successful
   */
  disconnect: () => Promise<boolean>;
  /**
   * Sends an event to the event producer
   * @param topic - The topic to send the event to
   * @param message - The message to send
   * @param options - The producer options
   * @returns A promise that resolves to a ProducerResult
   */
  send: (
    topic: string,
    message: Buffer | string,
    options?: ProducerOptions
  ) => Promise<ProducerResult>;
  /**
   * Sends a batch of events to the event producer
   * @param topic - The topic to send the events to
   * @param messages - The messages to send
   * @param options - The producer options
   * @returns A promise that resolves to an array of ProducerResult
   */
  sendBatch: (
    topic: string,
    messages: (Buffer | string)[],
    options?: ProducerOptions
  ) => Promise<ProducerResult[]>;
};
