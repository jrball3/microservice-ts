import { Dependencies } from './dependencies';
import { HttpMethod } from './method';
import { RouteHandler } from './route-handler';

/**
 * A route definition
 */
export type RouteDefinition<D extends Dependencies = Dependencies> = {
  path: string;
  method: HttpMethod;
  handler: RouteHandler<D>;
};
