import { HttpMethod } from './method';

/**
 * A request context
 */
export type RequestContext = {
  requestId: string;
  path: string;
  method: HttpMethod;
};
