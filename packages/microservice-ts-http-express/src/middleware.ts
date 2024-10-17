import express from 'express';
import { observability, http } from '@jrball3/microservice-ts';
import * as optsNS from './opts';
import { processResponse } from './response';
import { ExpressRouteDefinition } from './route-definition';

export const getMiddleware = <D extends http.Dependencies = http.Dependencies>(route: http.RouteDefinition<D>): express.RequestHandler[] => {
  return (route as ExpressRouteDefinition<D>).middleware ?? [];
};

type WrapMiddlewareDependencies<D extends http.Dependencies = http.Dependencies> = {
  config: http.config.HttpConfig<D>;
  context?: http.RequestContext;
  dependencies: D;
  observabilityService: observability.ObservabilityService;
  opts?: optsNS.ExpressProviderOpts;
  route: http.RouteDefinition<D>;
};

export const wrapMiddleware = <D extends http.Dependencies = http.Dependencies>(deps: WrapMiddlewareDependencies<D>) =>
  (middleware: express.RequestHandler): express.RequestHandler => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await middleware(req, res, next);
      } catch (error) {
        const response = {
          statusCode: 500,
          data: http.errors.toErrorResponse(error),
        };
        processResponse(deps)(res, next)(response);
      }
    };
  };
