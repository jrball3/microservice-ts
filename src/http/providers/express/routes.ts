import express from 'express';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import * as handlerNS from './handler';
import * as optsNS from './opts';
import * as middlewareNS from './middleware';

/**
 * Applies the routes to an Express application
 * @param dependencies - The dependencies
 * @returns A function that applies the routes to an Express application
 */
export const apply = <D extends Dependencies = Dependencies>(dependencies: D) =>
  (config: configNS.HttpConfig<D>) =>
    (
      app: express.Application,
      opts?: optsNS.ExpressProviderOpts,
    ): express.Application => {
      config.routes.forEach((route) => {
        const { logger } = dependencies;
        const deps = { logger, config, dependencies, route, opts };
        let wrappedMiddlewares: express.RequestHandler[] = [];
        const rawMiddlewares = middlewareNS.getMiddleware(route) ?? [];
        for (const middlewareFn of rawMiddlewares) {
          const wrappedMiddleware = middlewareNS.wrapMiddleware(deps)(middlewareFn);
          wrappedMiddlewares = [...wrappedMiddlewares, wrappedMiddleware];
        }
        const { path, method, handler } = route;
        const wrapHandlerDeps = { logger, config, dependencies, route, opts };
        const wrappedHandler = handlerNS.toExpressHandler(wrapHandlerDeps)(handler);
        app[method](path, [...wrappedMiddlewares, wrappedHandler]);
      });
      return app;
    };
