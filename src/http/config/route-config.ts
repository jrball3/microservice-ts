import { HttpMethod } from '../method';
import { RouteHandler } from '../route-handler';

/**
 * A route configuration
 */
export type RouteConfig = {
  path: string;
  method: HttpMethod;
  handler: RouteHandler;
};
