import * as http from '../http';
import * as logging from '../logging';
/**
 * A microservice configuration
 */
export type MicroserviceConfig<
  EventConsumerConfig,
  EventProducerConfig,
  HttpDeps extends http.Dependencies = http.Dependencies,
> = {
  http: http.config.HttpConfig<HttpDeps>;
  logging: logging.config.LoggingConfig;
  eventConsumers: Record<string, EventConsumerConfig>;
  eventProducers: Record<string, EventProducerConfig>;
};
