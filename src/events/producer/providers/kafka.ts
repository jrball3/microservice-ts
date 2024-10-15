import { Kafka, KafkaConfig, Producer, ProducerConfig } from 'kafkajs';
import { Provider } from '../../../di';
import * as logging from '../../../logging';
import { EventProducerDependencies } from '../dependencies';
import { EventProducer, ProducerOptions, ProducerResult } from '../producer';

/**
 * The Kafka producer config
 */
export type KafkaProducerConfig = {
  config: KafkaConfig;
  producerConfig: ProducerConfig;
};

/**
 * The Kafka producer
 */
export interface KafkaProducer extends EventProducer {
  producer: Producer;
}

/**
 * Creates a Kafka producer provider
 */
export const createProvider = (
  config: KafkaProducerConfig,
): Provider<EventProducerDependencies, KafkaProducer> => ({
  resolve: (dependencies: EventProducerDependencies): KafkaProducer => {
    const { logger } = dependencies;

    const kafka = new Kafka(config.config);
    const producer = kafka.producer(config.producerConfig);

    return {
      producer,
      connect: async (): Promise<boolean> => {
        try {
          await producer.connect();
          return true;
        } catch (error) {
          logging.events.logEvent(logger)(logging.LogLevel.ERROR, {
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
      },
      sendBatch: async (
        topic: string,
        messages: (string | Buffer)[],
        options?: ProducerOptions,
      ): Promise<ProducerResult[]> => {
        const key = options?.key;
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
      },
    };
  },
});

/**
 * Creates a multi-producer provider
 */
export const createMultiProvider = (
  providers: Record<string, Provider<EventProducerDependencies, KafkaProducer>>,
): Provider<EventProducerDependencies, Record<string, KafkaProducer>> => ({
  resolve: (dependencies: EventProducerDependencies): Record<string, KafkaProducer> => {
    return Object.entries(providers).reduce((acc, [key, provider]) => {
      acc[key] = provider.resolve(dependencies);
      return acc;
    }, {} as Record<string, KafkaProducer>);
  },
});
