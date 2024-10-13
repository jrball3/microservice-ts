import express from 'express';

import { Dependencies } from '../../../dependencies';
import * as config from '../../config';
import { BuildServerFn } from '../registry';
import * as routes from './routes';

/**
 * Creates a build function for an Express server
 * @param app - The Express application
 * @returns A build function
 */
export const createBuildFn = (app: express.Application): BuildServerFn => 
  (dependencies: Dependencies) =>
    (config: config.HttpConfig) => {
      routes.apply(dependencies)(config)(app);
      return app.listen(config.port, config.host, () => {
        console.log(`Server is running on port ${config.port}`);
      });
    }
