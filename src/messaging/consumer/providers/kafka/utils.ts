import { Consumer } from 'kafkajs';
import { Dependencies } from '../../dependencies';
import { KafkaConsumer, KafkaConsumerConfig } from './kafka';
import * as logging from '../../../../logging';

/**
 * Creates a Kafka consumer from a consumer
 * @param dependencies - The event consumer dependencies
 * @param config - The Kafka consumer configuration
 * @param consumer - The Kafka consumer
 * @returns A Kafka consumer
 */
export const fromConsumer = <D extends Dependencies = Dependencies>(dependencies: D) =>
  (config: KafkaConsumerConfig<D>, consumer: Consumer): KafkaConsumer => {
    const { logger } = dependencies;
    const logEvent = logging.events.logEvent(logger);
    return {
      consumer,
      connect: async (): Promise<boolean> => {
        try {
          await consumer.connect();
          logEvent(logging.LogLevel.INFO, {
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
          logEvent(logging.LogLevel.ERROR, {
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
          logEvent(logging.LogLevel.INFO, {
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
          logEvent(logging.LogLevel.ERROR, {
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
          await consumer.run({
            ...config.runConfig,
            eachBatch: config.runConfig.eachBatch?.(dependencies),
            eachMessage: config.runConfig.eachMessage?.(dependencies),
          });
          logEvent(logging.LogLevel.INFO, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer started',
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
          logEvent(logging.LogLevel.ERROR, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer start failed',
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
          logEvent(logging.LogLevel.ERROR, {
            eventType: 'kafka consumer',
            eventName: 'kafka consumer stop failed',
            eventTimestamp: new Date(),
            eventData: { error },
          });
          throw error;
        }
      },
    };
  };