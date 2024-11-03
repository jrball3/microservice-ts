import * as retryDlq from '../retry-dlq';
import * as observability from '../../observability';

/**
 * The event consumer dependencies
 */
export type Dependencies = {
  retryDlqService?: retryDlq.RetryDlqService;
  observabilityService: observability.ObservabilityService;
};
