import { Dependencies } from './dependencies';
import * as kafka from './providers/kafka/kafka';

/**
 * The event consumer configuration
 */
export type EventConsumerConfig<D extends Dependencies = Dependencies> = kafka.KafkaConsumerConfig<D>;
