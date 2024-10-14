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

type ToExpressHandlerDependencies = {
  logger: logging.Logger;
  config: configNS.HttpConfig;
  dependencies: Dependencies;
  route: RouteDefinition;
  opts?: optsNS.ExpressProviderOpts;
};

export const toExpressHandler = (deps: ToExpressHandlerDependencies) =>
  (handler: RouteHandler): express.RequestHandler =>
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const { route, opts } = deps;
      const context = utils.createRequestContext(route, opts)(req);
      const processRequestDeps = { ...deps, route, context };
      const response = await processRequest(processRequestDeps)(handler)(req);
      processResponse(processRequestDeps)(res, next)(response);
    };
