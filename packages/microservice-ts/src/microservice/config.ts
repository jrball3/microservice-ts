import * as http from '../http';
import * as logging from '../logging';

/**
 * A microservice configuration
 */
export type MicroserviceConfig<
  HttpDeps extends http.Dependencies = never,
  EventConsumerConfig = never,
  EventProducerConfig = never,
  JobServiceConfig = never,
  RetryDlqConfig = never,
> = {
  http: http.config.HttpConfig<HttpDeps>;
  logging: logging.config.LoggingConfig;
  eventConsumers: Record<string, EventConsumerConfig>;
  eventProducers: Record<string, EventProducerConfig>;
  jobService: JobServiceConfig;
  retryDlq: Record<string, RetryDlqConfig>;
};
