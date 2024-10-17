import { Kafka, KafkaConfig, Producer, ProducerConfig } from 'kafkajs';
import { Provider } from '../../../../di';
import { EventProducerDependencies } from '../../dependencies';
import { EventProducer } from '../../producer';
import { fromProducer } from './utils';

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
): Provider<EventProducerDependencies, KafkaProducer> =>
  (dependencies: EventProducerDependencies): KafkaProducer => {
    const kafka = new Kafka(config.config);
    const producer = kafka.producer(config.producerConfig);
    return fromProducer(dependencies)(config, producer);
  };

/**
 * Creates a multi-producer provider
 */
export const createMultiProvider = (
  providers: Record<string, Provider<EventProducerDependencies, KafkaProducer>>,
): Provider<EventProducerDependencies, Record<string, KafkaProducer>> =>
  (dependencies: EventProducerDependencies): Record<string, KafkaProducer> => (
    Object.entries(providers).reduce((acc, [key, provider]) => {
      acc[key] = provider(dependencies);
      return acc;
    }, 
    {} as Record<string, KafkaProducer>,
    )
  );
