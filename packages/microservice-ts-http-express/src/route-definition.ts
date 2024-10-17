import * as express from 'express';
import { http } from '@jrball3/microservice-ts';
/**
 * An Express route definition
 */
export type ExpressRouteDefinition<D extends http.Dependencies = http.Dependencies> = http.RouteDefinition<D> & {
  middleware?: express.RequestHandler[];
};
