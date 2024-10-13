import * as http from './http';
import * as nodehttp from 'http';
import * as logging from './logging';
import { MicroserviceConfig } from './config';

/**
 * A microservice
 */
export type Microservice = {
  httpServer?: nodehttp.Server;
  logger?: logging.Logger;
};

/**
 * Starts a microservice
 * @returns A function that starts a microservice
 */
export const start = (config: MicroserviceConfig): Microservice => {
  const httpProvider = http.providers.registry.get(config.http.provider);
  const loggingProvider = logging.providers.registry.get(config.logging.provider);
  if (httpProvider && !loggingProvider) {
    throw new Error('Logging configuration is required for HTTP microservices');
  }
  let logger: logging.Logger | undefined;
  if (loggingProvider) {
    const logDeps: logging.Dependencies = {};
    logger = loggingProvider.buildLogger(logDeps)(config.logging);
  }
  let httpServer: nodehttp.Server | undefined;
  if (logger && httpProvider) {
    const httpDeps: http.Dependencies = { logger };
    httpServer = httpProvider.buildServer(httpDeps)(config.http);
  }
  return { httpServer, logger };
};

/**
 * Stops a microservice
 * @param microservice - The microservice
 */
export const stop = (microservice: Microservice): void => {
  if (microservice.httpServer) {
    microservice.httpServer.close();
  }
};
