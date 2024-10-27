import * as observability from '../observability';

/**
 * The dependencies for the retry-dlq microservice.
 */
export type Dependencies = {
  observabilityService: observability.ObservabilityService;
}
