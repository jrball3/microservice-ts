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

export const getMiddleware = <D extends Dependencies = Dependencies>(route: RouteDefinition<D>): express.RequestHandler[] => {
  return (route as ExpressRouteDefinition<D>).middleware ?? [];
};

type WrapMiddlewareDependencies<D extends Dependencies = Dependencies> = {
  config: configNS.HttpConfig<D>;
  context?: RequestContext;
  dependencies: D;
  logger: logging.Logger;
  opts?: optsNS.ExpressProviderOpts;
  route: RouteDefinition<D>;
};

export const wrapMiddleware = <D extends Dependencies = Dependencies>(deps: WrapMiddlewareDependencies<D>) => 
  (middleware: express.RequestHandler): express.RequestHandler => {
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
