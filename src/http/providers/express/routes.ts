import express from 'express';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import * as handlerNS from './handler';
import * as optsNS from './opts';

/**
 * Applies the routes to an Express application
 * @param dependencies - The dependencies
 * @returns A function that applies the routes to an Express application
 */
export const apply = (dependencies: Dependencies) =>
  (config: configNS.HttpConfig) =>
    (
      app: express.Application,
      opts?: optsNS.ExpressProviderOpts,
    ): express.Application => {
      config.routes.forEach((route) => {
        const { logger } = dependencies;
        const { path, method, handler } = route;
        const wrapHandlerDeps = { logger, config, dependencies, route, opts };
        app[method](path, handlerNS.wrapHandler(wrapHandlerDeps)(handler));
      });
      return app;
    };
