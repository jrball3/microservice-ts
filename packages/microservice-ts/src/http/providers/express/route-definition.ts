import * as express from 'express';
import { Dependencies } from '../../dependencies';
import { RouteDefinition } from '../../route-definition';

/**
 * An Express route definition
 */
export type ExpressRouteDefinition<D extends Dependencies = Dependencies> = RouteDefinition<D> & {
  middleware?: express.RequestHandler[];
};
