import * as http from '../http';
import * as logging from '../logging';
import * as messaging from '../messaging';
/**
 * A microservice configuration
 */
export type MicroserviceConfig<
  HttpDeps extends http.Dependencies = http.Dependencies,
  EventConsumerDeps extends messaging.consumer.Dependencies = messaging.consumer.Dependencies,
> = {
  http: http.config.HttpConfig<HttpDeps>;
  logging: logging.config.LoggingConfig;
  eventConsumers: Record<string, messaging.consumer.config.EventConsumerConfig<EventConsumerDeps>>
  eventProducers: Record<string, messaging.producer.config.EventProducerConfig>
};
