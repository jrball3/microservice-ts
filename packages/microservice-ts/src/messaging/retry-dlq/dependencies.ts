import * as jobs from '../../jobs/jobs';
import * as observability from '../../observability';

/**
 * The dependencies for the retry-dlq microservice.
 */
export type Dependencies<JobQueueConfig, AddQueueResult> = {
  observabilityService: observability.ObservabilityService;
  jobService: jobs.JobService<JobQueueConfig, AddQueueResult>;
}
