import * as http from '../http';
import * as logging from '../logging';
import * as messaging from '../messaging';
import * as jobs from '../jobs';
import * as observability from '../observability';

/**
 * The dependencies for the microservice
 */
export type Dependencies<
  JobQueueConfig = never,
  AddQueueResult = never
> = {
  httpServer?: http.HttpServer;
  logger?: logging.Logger;
  eventConsumers?: Record<string, messaging.consumer.EventConsumer>;
  eventProducers?: Record<string, messaging.producer.EventProducer>;
  observabilityService?: observability.ObservabilityService;
  jobService?: jobs.JobService<JobQueueConfig, AddQueueResult>;
  retryDlqService?: messaging.retryDlq.RetryDlqService;
};
