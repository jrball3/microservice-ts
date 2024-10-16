import * as http from '../http';
import * as logging from '../logging';
import * as messaging from '../messaging';

/**
 * A microservice configuration
 */
export type MicroserviceConfig = {
  http: http.config.HttpConfig;
  logging: logging.config.LoggingConfig;
  eventConsumers: Record<string, messaging.consumer.config.EventConsumerConfig>
  eventProducers: Record<string, messaging.producer.config.EventProducerConfig>
};
