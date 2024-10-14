import * as express from 'express';
import { RouteDefinition } from '../../route-definition';

/**
 * An Express route definition
 */
export type ExpressRouteDefinition = RouteDefinition & {
  middleware?: express.RequestHandler[];
};
