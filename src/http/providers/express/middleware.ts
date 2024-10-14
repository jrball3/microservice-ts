import express from 'express';
import * as logging from '../../../logging';
import * as configNS from '../../config';
import { RouteConfig } from '../../config';
import { Dependencies } from '../../dependencies';
import { toErrorResponse } from '../../errors';
import { RequestContext } from '../../request-context';
import { ExpressRouteConfig } from './config';
import * as optsNS from './opts';
import { processResponse } from './response';

export const getMiddleware = (route: RouteConfig): express.RequestHandler[] => {
  return (route as ExpressRouteConfig).middleware ?? [];
};

type WrapMiddlewareDependencies = {
  config: configNS.HttpConfig;
  context?: RequestContext;
  dependencies: Dependencies;
  logger: logging.Logger;
  opts?: optsNS.ExpressProviderOpts;
  route: configNS.RouteConfig;
};

export const wrapMiddleware = (deps: WrapMiddlewareDependencies) => (middleware: express.RequestHandler): express.RequestHandler => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await middleware(req, res, next);
    } catch (error) {
      const response = {
        code: 500,
        data: toErrorResponse(error),
      };
      processResponse(deps)(res, next)(response);
    }
  };
};
