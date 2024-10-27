import * as jobs from '../../jobs';

export type RetryDlqService = {
  /**
   * Starts the retry Dlq service.
   */
  start: () => Promise<boolean>;
  /**
   * Pauses the retry Dlq service.
   */
  pause: () => Promise<boolean>;
  /**
   * Resumes the retry Dlq service.
   */
  resume: () => Promise<boolean>;
  /**
   * Stops the retry Dlq service.
   */
  stop: () => Promise<boolean>;
  /**
   * Enqueues a retry job for a given topic and consumer group.
   */
  enqueueConsumerRetry: <T>(topicName: string, consumerGroup: string, data: T) => Promise<jobs.JobEntry<T>>;
  /**
   * Gets the dead letter queue for a given topic and consumer group.
   */
  getConsumerDlq: <T>(topicName: string, consumerGroup: string) => Promise<readonly jobs.FailedJobEntry<T>[]>;
  /**
   * Revives a dead letter job for a given topic and consumer group.
   */
  reviveConsumerDlq: <T>(topicName: string, consumerGroup: string, entryID: string) => Promise<jobs.JobEntry<T> | undefined>;
  /**
   * Enqueues a retry job for a given producer.
   */
  enqueueProducerRetry: <T>(producer: string, data: T) => Promise<jobs.JobEntry<T>>;
  /**
   * Gets the dead letter queue for a given producer.
   */
  getProducerDlq: <T>(producer: string) => Promise<readonly jobs.FailedJobEntry<T>[]>;
  /**
   * Revives a dead letter job for a given producer.
   */
  reviveProducerDlq: <T>(producer: string, entryID: string) => Promise<jobs.JobEntry<T> | undefined>;
}
