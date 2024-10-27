import { di, messaging } from '@jrball3/microservice-ts';
import { Consumer, ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopics, EachBatchPayload, EachMessagePayload, Kafka, KafkaConfig } from 'kafkajs';
import { fromConsumer } from './utils';

/**
 * The wrapped each batch handler
 * Accepts the dependencies and returns an each batch handler
 */
export type WrappedEachBatchHandler<D extends messaging.consumer.Dependencies = messaging.consumer.Dependencies> = (dependencies: D) =>
(payload: EachBatchPayload) => Promise<void>;

/**
 * The wrapped each message handler
 * Accepts the dependencies and returns an each message handler
 */
export type WrappedEachMessageHandler<D extends messaging.consumer.Dependencies = messaging.consumer.Dependencies> = (dependencies: D) =>
(payload: EachMessagePayload) => Promise<void>;

/**
 * The wrapped consumer run config
 * Omits the eachBatch and eachMessage properties and adds the WrappedEachBatchHandler and WrappedEachMessageHandler properties
 * This allows for the dependencies to be provided to the eachBatch and eachMessage handlers
 */
export type WrappedConsumerRunConfig<D extends messaging.consumer.Dependencies = messaging.consumer.Dependencies> = Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'> & {
  eachBatch?: WrappedEachBatchHandler<D>;
  eachMessage?: WrappedEachMessageHandler<D>;
};

/**
 * The Kafka consumer configuration
 */
export type KafkaConsumerConfig<D extends messaging.consumer.Dependencies = messaging.consumer.Dependencies> =
{
  kafka: KafkaConfig;
  consumer: Omit<ConsumerConfig, 'runConfig'> & {
    runConfig: WrappedConsumerRunConfig<D>;
    subscribeTopics: ConsumerSubscribeTopics;
  };
};

/**
 * The Kafka consumer
 */
export interface KafkaConsumer extends messaging.consumer.EventConsumer {
  consumer: Consumer;
}

const createConsumer = <D extends messaging.consumer.Dependencies>(
  config: KafkaConsumerConfig<D>,
): Consumer => {
  const kafka = new Kafka(config.kafka);
  return kafka.consumer(config.consumer);
}

/**
 * Creates a Kafka consumer provider
 * @param config - The Kafka consumer configuration
 * @returns A Kafka consumer provider
 */
export const createProvider = <D extends messaging.consumer.Dependencies = messaging.consumer.Dependencies>(
  config: KafkaConsumerConfig<D>,
  consumerFactory?: (config: KafkaConsumerConfig<D>) => Consumer,
): di.Provider<D, KafkaConsumer> =>
    (dependencies: D): KafkaConsumer => {
      const consumer = consumerFactory
          ? consumerFactory(config)
          : createConsumer(config);
      return fromConsumer(dependencies)(config, consumer);
    };

/**
 * Creates a multi-consumer provider
 */
export const createMultiProvider = <D extends messaging.consumer.Dependencies = messaging.consumer.Dependencies>(
  providers: Record<string, di.Provider<D, KafkaConsumer>>,
): di.Provider<D, Record<string, KafkaConsumer>> =>
    (dependencies: D): Record<string, KafkaConsumer> => (
      Object.entries(providers).reduce(
        (acc, [key, provider]) => {
          acc[key] = provider(dependencies);
          return acc;
        },
        {} as Record<string, KafkaConsumer>,
      )
    );
