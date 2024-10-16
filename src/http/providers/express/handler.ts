import express from 'express';
import * as logging from '../../../logging';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import { RouteHandler } from '../../route-handler';
import * as optsNS from './opts';
import * as utils from './utils';
import { processResponse } from './response';
import { processRequest } from './request';
import { RouteDefinition } from '../../route-definition';

/**
 * The dependencies for the toExpressHandler function
 */
type ToExpressHandlerDependencies<D extends Dependencies = Dependencies> = {
  logger: logging.Logger;
  config: configNS.HttpConfig<D>;
  dependencies: D;
  route: RouteDefinition<D>;
  opts?: optsNS.ExpressProviderOpts;
};

/**
 * Converts a route handler to an Express request handler
 * @param deps - The dependencies
 * @returns - The Express request handler
 */
export const toExpressHandler = <D extends Dependencies = Dependencies>(deps: ToExpressHandlerDependencies<D>) =>
  (handler: RouteHandler<D>): express.RequestHandler =>
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const { route, opts } = deps;
      const context = utils.createRequestContext(route, opts)(req);
      const processRequestDeps = { ...deps, route, context };
      const response = await processRequest(processRequestDeps)(handler)(req);
      processResponse(processRequestDeps)(res, next)(response);
    };
