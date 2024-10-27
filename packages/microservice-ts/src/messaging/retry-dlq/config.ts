import { Dependencies } from "./dependencies";

/**
 * A backoff strategy for a retry queue.
 */
export type BackoffOptions = {
  /**
   * Name of the backoff strategy.
   */
  type: 'fixed' | 'exponential' | (string & {});
  /**
   * Delay in milliseconds.
   */
  delay?: number;
}

/**
 * An identifier for a producer.
 */
export type ProducerIdentifier = {
  /**
   * The name of the producer.
   */
  producer: string;
}

export const isProducerIdentifier = (
  identifier: ConsumerIdentifier | ProducerIdentifier
): identifier is ProducerIdentifier => 'producer' in identifier;

/**
 * An identifier for a consumer.
 */
export type ConsumerIdentifier = {
  /**
   * The topic that this retry queue is for.
   */
  topic: string;
  /**
   * The consumer group that this retry queue is for.
   */
  consumerGroup: string;
}

export const isConsumerIdentifier = (
  identifier: ConsumerIdentifier | ProducerIdentifier
): identifier is ConsumerIdentifier => 'consumerGroup' in identifier;

/**
 * A configuration for a retry / dead letter queue.
 */
export type RetryDlqConfig<QueueConfig, AddQueueResult, Deps extends Dependencies<QueueConfig, AddQueueResult>, Data> = {
  /**
   * The identifier for the retry queue.
   */
  identifier: ConsumerIdentifier | ProducerIdentifier;
  /**
   * The total number of attempts to try the job until it completes.
   */
  attempts: number;
  /**
   * An amount of milliseconds to wait until this job can be processed.
   */
  delay?: number;
  /**
   * Backoff setting for automatic retries if the job fails
   */
  backoff?: number | BackoffOptions;

  /**
   * The handler for the retry queue.
   */
  handler: (dependencies: Deps) => (data: Data) => Promise<void>;
}
