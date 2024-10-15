import { Consumer, ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopics, Kafka, KafkaConfig } from 'kafkajs';
import { Provider } from '../../../di/provider';
import * as logging from '../../../logging';
import { EventConsumer } from '../consumer';
import { EventConsumerDependencies } from '../dependencies';

/**
 * The Kafka consumer configuration
 */
export type KafkaConsumerConfig = {
  clientId: string;
  brokers: string[];
  groupId: string;
  subscribeTopics: ConsumerSubscribeTopics,
  runConfig: ConsumerRunConfig;
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
): Provider<EventConsumerDependencies, KafkaConsumer> => ({
  resolve: (dependencies: EventConsumerDependencies): KafkaConsumer => {
    const { logger } = dependencies;

    const kafkaConfig: KafkaConfig = {
      clientId: config.clientId,
      brokers: config.brokers,
    };

    const consumerConfig: ConsumerConfig = {
      groupId: config.groupId,
    };

    const kafka = new Kafka(kafkaConfig);
    const consumer = kafka.consumer(consumerConfig);

    return {
      consumer,
      connect: async (): Promise<boolean> => {
        try {
          await consumer.connect();
          logging.events.logEvent(logger)(logging.LogLevel.INFO, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer connected',
            eventTimestamp: new Date(),
            eventData: {
              clientId: config.clientId,
              brokers: config.brokers,
              groupId: config.groupId,
            },
          });
          return true;
        } catch (error) {
          logging.events.logEvent(logger)(logging.LogLevel.ERROR, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer connection failed',
            eventTimestamp: new Date(),
            eventData: {
              error: error,
            },
          });
          throw error;
        }
      },
      disconnect: async (): Promise<boolean> => {
        try {
          await consumer.disconnect();
          logging.events.logEvent(logger)(logging.LogLevel.INFO, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer disconnected',
            eventTimestamp: new Date(),
            eventData: {
              clientId: config.clientId,
              brokers: config.brokers,
              groupId: config.groupId,
            },
          });
          return true;
        } catch (error) {
          logging.events.logEvent(logger)(logging.LogLevel.ERROR, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer disconnection failed',
            eventTimestamp: new Date(),
            eventData: { error },
          });
          throw error;
        }
      },
      start: async (): Promise<boolean> => {
        try {
          await consumer.subscribe(config.subscribeTopics);
          await consumer.run(config.runConfig);
          logging.events.logEvent(logger)(logging.LogLevel.INFO, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer subscribed',
            eventTimestamp: new Date(),
            eventData: {
              clientId: config.clientId,
              brokers: config.brokers,
              groupId: config.groupId,
              topics: config.subscribeTopics.topics,
            },
          });
          return true;
        } catch (error) {
          logging.events.logEvent(logger)(logging.LogLevel.ERROR, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer subscription failed',
            eventTimestamp: new Date(),
            eventData: { error },
          });
          throw error;
        }
      },
      stop: async (): Promise<boolean> => {
        try {
          await consumer.stop();
          return true;
        } catch (error) {
          logging.events.logEvent(logger)(logging.LogLevel.ERROR, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer stop failed',
            eventTimestamp: new Date(),
            eventData: { error },
          });
          throw error;
        }
      },
    };
  },
});

/**
 * Creates a multi-consumer provider
 */
export const createMultiProvider = (
  providers: Record<string, Provider<EventConsumerDependencies, KafkaConsumer>>,
): Provider<EventConsumerDependencies, Record<string, KafkaConsumer>> => ({
  resolve: (dependencies: EventConsumerDependencies): Record<string, KafkaConsumer> => {
    return Object.entries(providers).reduce((acc, [key, provider]) => {
      acc[key] = provider.resolve(dependencies);
      return acc;
    }, {} as Record<string, KafkaConsumer>);
  },
});
