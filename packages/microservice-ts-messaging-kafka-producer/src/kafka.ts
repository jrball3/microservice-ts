import { Kafka, KafkaConfig, Producer, ProducerConfig } from 'kafkajs';
import { di, messaging } from '@jrball3/microservice-ts';
import { fromProducer } from './utils';

/**
 * The Kafka producer config
 */
export type KafkaProducerConfig = {
  kafka: KafkaConfig;
  producer: ProducerConfig;
};

/**
 * The Kafka producer
 */
export interface KafkaProducer extends messaging.producer.EventProducer {
  producer: Producer;
}


/**
 * Creates a Kafka producer provider
 */
export const createProvider = (
  config: KafkaProducerConfig,
): di.Provider<messaging.producer.EventProducerDependencies, KafkaProducer> =>
  (dependencies: messaging.producer.EventProducerDependencies): KafkaProducer => {
    const kafka = new Kafka(config.kafka);
    const producer = kafka.producer(config.producer);
    return fromProducer(dependencies)(config, producer);
  };

/**
 * Creates a multi-producer provider
 */
export const createMultiProvider = (
  providers: Record<string, di.Provider<messaging.producer.EventProducerDependencies, KafkaProducer>>,
): di.Provider<messaging.producer.EventProducerDependencies, Record<string, KafkaProducer>> =>
  (dependencies: messaging.producer.EventProducerDependencies): Record<string, KafkaProducer> => (
    Object.entries(providers).reduce(
      (acc, [key, provider]) => {
        acc[key] = provider(dependencies);
        return acc;
      }, 
      {} as Record<string, KafkaProducer>,
    )
  );
