import * as http from '../http';
import * as logging from '../logging';
import * as events from '../events';

/**
 * A microservice configuration
 */
export type MicroserviceConfig = {
  http: http.config.HttpConfig;
  logging: logging.config.LoggingConfig;
  eventConsumers: Record<string, events.consumer.config.EventConsumerConfig>
  eventProducers: Record<string, events.producer.config.EventProducerConfig>
};
