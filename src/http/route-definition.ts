import { HttpMethod } from './method';
import { RouteHandler } from './route-handler';

/**
 * A route definition
 */
export type RouteDefinition = {
  path: string;
  method: HttpMethod;
  handler: RouteHandler;
};
