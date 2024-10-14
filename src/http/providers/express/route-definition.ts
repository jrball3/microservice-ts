import * as express from 'express';
import { RouteDefinition } from '../../route-definition';

export type ExpressRouteDefinition = RouteDefinition & {
  middleware?: express.RequestHandler[];
};
