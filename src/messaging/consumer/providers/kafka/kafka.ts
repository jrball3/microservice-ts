import { Consumer, ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopics, EachBatchPayload, EachMessagePayload, Kafka, KafkaConfig } from 'kafkajs';
import { Provider } from '../../../../di';
import { EventConsumer } from '../../consumer';
import { EventConsumerDependencies } from '../../dependencies';
import { fromConsumer } from './utils';

/**
 * The wrapped each batch handler
 * Accepts the dependencies and returns an each batch handler
 */
export type WrappedEachBatchHandler = (dependencies: EventConsumerDependencies) =>
  (payload: EachBatchPayload) => Promise<void>;

/**
 * The wrapped each message handler
 * Accepts the dependencies and returns an each message handler
 */
export type WrappedEachMessageHandler = (dependencies: EventConsumerDependencies) =>
  (payload: EachMessagePayload) => Promise<void>;

/**
 * The wrapped consumer run config
 * Omits the eachBatch and eachMessage properties and adds the WrappedEachBatchHandler and WrappedEachMessageHandler properties
 * This allows for the dependencies to be provided to the eachBatch and eachMessage handlers
 */
export type WrappedConsumerRunConfig = Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'> & {
  eachBatch?: WrappedEachBatchHandler;
  eachMessage?: WrappedEachMessageHandler;
};

/**
 * The Kafka consumer configuration
 */
export type KafkaConsumerConfig = {
  clientId: string;
  brokers: string[];
  groupId: string;
  subscribeTopics: ConsumerSubscribeTopics,
  runConfig: WrappedConsumerRunConfig;
};

/**
 * The Kafka consumer
 */
export interface KafkaConsumer extends EventConsumer {
  consumer: Consumer;
}



/**
 * Creates a Kafka consumer provider
 * @param config - The Kafka consumer configuration
 * @returns A Kafka consumer provider
 */
export const createProvider = (
  config: KafkaConsumerConfig,
): Provider<EventConsumerDependencies, KafkaConsumer> =>
  (dependencies: EventConsumerDependencies): KafkaConsumer => {
    const kafkaConfig: KafkaConfig = {
      clientId: config.clientId,
      brokers: config.brokers,
    };
    const consumerConfig: ConsumerConfig = {
      groupId: config.groupId,
    };
    const kafka = new Kafka(kafkaConfig);
    const consumer = kafka.consumer(consumerConfig);
    return fromConsumer(dependencies)(config, consumer);
  };

/**
 * Creates a multi-consumer provider
 */
export const createMultiProvider = (
  providers: Record<string, Provider<EventConsumerDependencies, KafkaConsumer>>,
): Provider<EventConsumerDependencies, Record<string, KafkaConsumer>> =>
  (dependencies: EventConsumerDependencies): Record<string, KafkaConsumer> => (
    Object.entries(providers).reduce(
      (acc, [key, provider]) => {
        acc[key] = provider(dependencies);
        return acc;
      },
      {} as Record<string, KafkaConsumer>,
    )
  );
