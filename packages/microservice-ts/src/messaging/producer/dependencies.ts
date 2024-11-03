import * as retryDlq from '../retry-dlq';
import * as observability from '../../observability';

export type EventProducerDependencies = {
  retryDlqService?: retryDlq.RetryDlqService;
  observabilityService: observability.ObservabilityService;
};
