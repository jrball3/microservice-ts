import express from 'express';
import nodehttp from 'http';
import { Provider } from '../../../microservice/provider';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import { HttpServer } from '../../http-server';
import * as routes from './routes';

/**
 * An Express server
 */
class Server implements HttpServer {
  readonly app: express.Application;

  readonly config: configNS.HttpConfig;

  private server: nodehttp.Server | undefined;

  constructor(config: configNS.HttpConfig, app: express.Application) {
    this.app = app;
    this.config = config;
    this.server = undefined;
  }

  async start(): Promise<void> {
    this.server = this.app.listen(this.config.port, this.config.host, () => {
      console.log(`Server is running on port ${this.config.port}`);
    });
  }

  async stop(): Promise<void> {
    await new Promise((resolve, reject) => {
      this.server?.close((err?: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve(null);
        }
      });
    });
  }
}

/**
 * Creates an HTTP provider
 * @param buildServerFn - The function that builds a server
 * @returns An HTTP provider
 */
export const createProvider = (
  app: express.Application,
  config: configNS.HttpConfig,
): Provider<Dependencies, HttpServer> => {
  const resolve = (dependencies: Dependencies): HttpServer => {
    routes.apply(dependencies)(config)(app);
    return new Server(config, app);
  };
  return { resolve };
};
