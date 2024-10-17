import express from 'express';
import { http, observability } from '@jrball3/microservice-ts';
import { ExpressProviderOpts } from './opts';
import { processRequest } from './request';
import { processResponse } from './response';
import { createRequestContext } from './utils';

/**
 * The dependencies for the toExpressHandler function
 */
type ToExpressHandlerDependencies<D extends http.Dependencies = http.Dependencies> = {
  observabilityService: observability.ObservabilityService;
  config: http.config.HttpConfig<D>;
  dependencies: D;
  route: http.RouteDefinition<D>;
  opts?: ExpressProviderOpts;
};

/**
 * Converts a route handler to an Express request handler
 * @param deps - The dependencies
 * @returns - The Express request handler
 */
export const toExpressHandler = <D extends http.Dependencies = http.Dependencies>(deps: ToExpressHandlerDependencies<D>) =>
  (handler: http.routeHandler.RouteHandler<D>): express.RequestHandler =>
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const { route, opts } = deps;
      const context = createRequestContext(route, opts)(req);
      const processRequestDeps = { ...deps, route, context };
      const response = await processRequest(processRequestDeps)(handler)(req);
      processResponse(processRequestDeps)(res, next)(response);
    };
