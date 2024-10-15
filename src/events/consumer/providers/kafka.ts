import { Consumer, ConsumerConfig, EachMessagePayload, Kafka, KafkaConfig } from 'kafkajs';
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
  topic: string;
  handleMessage: (payload: EachMessagePayload) => Promise<boolean>;
}

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
      connect: async (): Promise<void> => {
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
      disconnect: async (): Promise<void> => {
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
        } catch (error) {
          logging.events.logEvent(logger)(logging.LogLevel.ERROR, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer disconnection failed',
            eventTimestamp: new Date(),
            eventData: {
              error: error,
            },
          });
          throw error;
        }
      },
      subscribe: async (): Promise<void> => {
        try {
          await consumer.subscribe({ topic: config.topic });
          await consumer.run({
            // TODO: other config options
            eachMessage: async (payload: EachMessagePayload) => {
              await config.handleMessage(payload);
            },
          });
          logging.events.logEvent(logger)(logging.LogLevel.INFO, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer subscribed',
            eventTimestamp: new Date(),
            eventData: {
              clientId: config.clientId,
              brokers: config.brokers,
              groupId: config.groupId,
              topic: config.topic,
            },
          });
        } catch (error) {
          logging.events.logEvent(logger)(logging.LogLevel.ERROR, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer subscription failed',
            eventTimestamp: new Date(),
            eventData: {
              error: error,
            },
          });
          throw error;
        }
      },
    };
  },
});
