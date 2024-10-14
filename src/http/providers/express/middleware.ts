import express from 'express';
import * as logging from '../../../logging';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import { toErrorResponse } from '../../errors';
import { RequestContext } from '../../request-context';
import { RouteDefinition } from '../../route-definition';
import * as optsNS from './opts';
import { processResponse } from './response';
import { ExpressRouteDefinition } from './route-definition';

export const getMiddleware = (route: RouteDefinition): express.RequestHandler[] => {
  return (route as ExpressRouteDefinition).middleware ?? [];
};

type WrapMiddlewareDependencies = {
  config: configNS.HttpConfig;
  context?: RequestContext;
  dependencies: Dependencies;
  logger: logging.Logger;
  opts?: optsNS.ExpressProviderOpts;
  route: RouteDefinition;
};

export const wrapMiddleware = (deps: WrapMiddlewareDependencies) => (middleware: express.RequestHandler): express.RequestHandler => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await middleware(req, res, next);
    } catch (error) {
      const response = {
        statusCode: 500,
        data: toErrorResponse(error),
      };
      processResponse(deps)(res, next)(response);
    }
  };
};
