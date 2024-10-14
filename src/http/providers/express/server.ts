import express from 'express';
import nodehttp from 'http';
import { Provider } from '../../../di/provider';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import { HttpServer } from '../../http-server';
import { ExpressProviderOpts } from './opts';
import * as routes from './routes';

/**
 * Creates an HTTP provider
 * @param buildServerFn - The function that builds a server
 * @returns An HTTP provider
 */
export const createProvider = (
  app: express.Application,
  config: configNS.HttpConfig,
  opts?: ExpressProviderOpts,
): Provider<Dependencies, HttpServer> => ({
  resolve: (dependencies: Dependencies): HttpServer => {
    routes.apply(dependencies)(config)(app, opts);
    let server: nodehttp.Server | undefined;

    const start = async (): Promise<void> => {
      return new Promise((resolve) => {
        server = app.listen(config.port, config.host, () => {
          console.log(`Server is running on port ${config.port}`);
          resolve();
        });
      });
    };

    const stop = async (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }
        server.close((err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    };

    return {
      start,
      stop,
    };
  },
});
