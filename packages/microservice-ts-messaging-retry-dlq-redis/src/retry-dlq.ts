import { di, messaging, jobs } from '@jrball3/microservice-ts';
import { AddQueueResult, QueueConfig } from '@jrball3/microservice-ts-job-service-bullmq';

const getConsumerQueueName = (topic: string, consumerGroup: string): string => `retry||consumer||${topic}||${consumerGroup}`;
const getProducerQueueName = (producer: string): string => `retry||producer||${producer}`;
const getQueueName = (identifier: messaging.retryDlq.ConsumerIdentifier | messaging.retryDlq.ProducerIdentifier): string =>
  messaging.retryDlq.isConsumerIdentifier(identifier)
    ? getConsumerQueueName(identifier.topic, identifier.consumerGroup)
    : getProducerQueueName(identifier.producer);

type RetryDlqState = {
  queues: Set<string>;
}

const createState = (): RetryDlqState => ({
  queues: new Set(),
});

const start = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  async (_state: RetryDlqState): Promise<boolean> => {
    await dependencies.jobService.start();
    return true;
  }

const stop = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  async (state: RetryDlqState): Promise<boolean> => {
    for (const queue of state.queues.values()) {
      await dependencies.jobService.stopQueue(queue);
    }
    state.queues.clear();
    return true;
  }

const pause = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  async (state: RetryDlqState): Promise<boolean> => {
    for (const queue of state.queues.values()) {
      await dependencies.jobService.pauseQueue(queue);
    }
    return true;
  }

const resume = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  async (state: RetryDlqState): Promise<boolean> => {
    for (const queue of state.queues.values()) {
      await dependencies.jobService.resumeQueue(queue);
    }
    return true;
  }

const addQueue = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  (state: RetryDlqState) =>
    <T>(config: messaging.retryDlq.RetryDlqConfig<QueueConfig, AddQueueResult, D, T>): boolean => {
      const retryQueueName = getQueueName(config.identifier);
      dependencies.jobService.addQueue(
        {
          name: retryQueueName,
          queueOptions: {
            defaultJobOptions: {
              attempts: config.attempts,
              delay: config.delay,
              backoff: config.backoff,
            },
          }
        },
        async (data: T) => {
          await config.handler(dependencies)(data);
        },
      );
      state.queues.add(retryQueueName);
      return true;
    };

const enqueueConsumerRetry = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  (_state: RetryDlqState) =>
    async <T>(topic: string, consumerGroup: string, data: T): Promise<jobs.JobEntry<T>> => {
      const retryQueueName = getConsumerQueueName(topic, consumerGroup);
      return dependencies.jobService.enqueueJob<T>(retryQueueName, data);
    }

const enqueueProducerRetry = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  (_state: RetryDlqState) =>
    async <T>(producer: string, data: T): Promise<jobs.JobEntry<T>> => {
      const retryQueueName = getProducerQueueName(producer);
      return dependencies.jobService.enqueueJob<T>(retryQueueName, data);
    }

const getConsumerDlq = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  (_state: RetryDlqState) =>
    async <T>(topic: string, consumerGroup: string): Promise<readonly jobs.FailedJobEntry<T>[]> => {
      const retryQueueName = getConsumerQueueName(topic, consumerGroup);
      return dependencies.jobService.getFailedJobs<T>(retryQueueName);
    }

const getProducerDlq = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  (_state: RetryDlqState) =>
    async <T>(producer: string): Promise<readonly jobs.FailedJobEntry<T>[]> => {
      const retryQueueName = getProducerQueueName(producer);
      return dependencies.jobService.getFailedJobs<T>(retryQueueName);
    }

const reviveConsumerDlq = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  (_state: RetryDlqState) =>
    async <T>(topic: string, consumerGroup: string, entryID: string): Promise<jobs.JobEntry<T> | undefined> => {
      const retryQueueName = getConsumerQueueName(topic, consumerGroup);
      return dependencies.jobService.retryJob<T>(retryQueueName, entryID);
    }

const reviveProducerDlq = <D extends messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>>(dependencies: D) =>
  (_state: RetryDlqState) =>
    async <T>(producer: string, entryID: string): Promise<jobs.JobEntry<T> | undefined> => {
      const retryQueueName = getProducerQueueName(producer);
      return dependencies.jobService.retryJob<T>(retryQueueName, entryID);
    }

export const createRetryDlqServiceProvider = (
  config: Record<string, messaging.retryDlq.RetryDlqConfig<QueueConfig, AddQueueResult, messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>, any>>
): di.Provider<messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>, messaging.retryDlq.RetryDlqService> =>
  (dependencies: messaging.retryDlq.Dependencies<QueueConfig, AddQueueResult>): messaging.retryDlq.RetryDlqService => {
    const state = createState();

    for (const c of Object.values(config)) {
      addQueue(dependencies)(state)(c);
    }

    return {
      start: () => start(dependencies)(state),
      stop: () => stop(dependencies)(state),
      pause: () => pause(dependencies)(state),
      resume: () => resume(dependencies)(state),
      enqueueConsumerRetry: enqueueConsumerRetry(dependencies)(state),
      getConsumerDlq: getConsumerDlq(dependencies)(state),
      reviveConsumerDlq: reviveConsumerDlq(dependencies)(state),
      enqueueProducerRetry: enqueueProducerRetry(dependencies)(state),
      getProducerDlq: getProducerDlq(dependencies)(state),
      reviveProducerDlq: reviveProducerDlq(dependencies)(state),
    };
  };
