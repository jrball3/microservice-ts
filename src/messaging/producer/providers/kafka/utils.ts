import { Producer } from 'kafkajs';
import { EventProducerDependencies, ProducerOptions, ProducerResult } from '../..';
import * as logging from '../../../../logging';
import { KafkaProducer, KafkaProducerConfig } from './kafka';

/**
 * Creates a Kafka producer from a KafkaJS producer
 * @param dependencies - The event producer dependencies
 * @param config - The Kafka producer configuration
 * @param producer - The Kafka producer
 * @returns A Kafka producer
 */
export const fromProducer = (dependencies: EventProducerDependencies) =>
  (config: KafkaProducerConfig, producer: Producer): KafkaProducer => {
    const { logger } = dependencies;
    const logEvent = logging.events.logEvent(logger);
    return {
      producer,
      connect: async (): Promise<boolean> => {
        try {
          await producer.connect();
          logEvent(logging.LogLevel.INFO, {
            eventType: 'kafka producer',
            eventName: 'kafka producer connected',
            eventTimestamp: new Date(),
            eventData: {
              config: config,
            },
          });
          return true;
        } catch (error) {
          logEvent(logging.LogLevel.ERROR, {
            eventType: 'kafka producer',
            eventName: 'kafka producer connection failed',
            eventTimestamp: new Date(),
            eventData: {
              error: error,
            },
          });
          throw error;
        }
      },
      disconnect: async (): Promise<boolean> => {
        await producer.disconnect();
        return true;
      },
      send: async (
        topic: string,
        message: Buffer | string,
        options?: ProducerOptions,
      ): Promise<ProducerResult> => {
        const key = options?.key;
        const value = message;
        try {
          const result = await producer.send({
            topic,
            messages: [{ key, value }],
            acks: options?.acks,
            timeout: options?.timeout,
          });
          return {
            success: result[0]?.errorCode === 0,
            ...result[0],
          };
        } catch (error) {
          logEvent(logging.LogLevel.ERROR, {
            eventType: 'kafka producer',
            eventName: 'kafka producer send failed',
            eventTimestamp: new Date(),
            eventData: {
              error: error,
            },
          });
          throw error;
        }
      },
      sendBatch: async (
        topic: string,
        messages: (string | Buffer)[],
        options?: ProducerOptions,
      ): Promise<ProducerResult[]> => {
        const key = options?.key;
        try {
          const result = await producer.send({
            topic,
            messages: messages.map((value) => ({ key, value })),
            acks: options?.acks,
            timeout: options?.timeout,
          });
          return result.map((r) => ({
            success: r.errorCode === 0,
            ...r,
          }));
        } catch (error) {
          logEvent(logging.LogLevel.ERROR, {
            eventType: 'kafka producer',
            eventName: 'kafka producer send batch failed',
            eventTimestamp: new Date(),
            eventData: {
              error: error,
            },
          });
          throw error;
        }
      },
    };
  };
