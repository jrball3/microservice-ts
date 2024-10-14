import * as express from 'express';
import { RouteConfig } from '../../config';

export type ExpressRouteConfig = RouteConfig & {
  middleware?: express.RequestHandler[];
};
