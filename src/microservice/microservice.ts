import { MicroserviceConfig } from './config';
import { Dependencies } from './dependencies';
import * as http from '../http';
import * as logging from '../logging';
import { Provider } from './provider';

/**
 * A microservice
 */
export type Microservice = {
  httpServer?: http.HttpServer;
  logger?: logging.Logger;
};

/**
 * Creates a microservice provider
 * @returns A microservice provider
 */
export const createProvider = (): Provider<Dependencies, Microservice> => {
  return {
    resolve: (dependencies): Microservice => {
      const logger = dependencies.loggingProvider?.resolve({});
      if (dependencies.httpProvider) {
        if (!logger) {
          throw new Error('Logging provider is required for HTTP microservices');
        }
        const httpServer = dependencies.httpProvider.resolve({ logger });
        return { httpServer, logger };
      }
      return { logger };
    },
  };
};

/**
 * Starts a microservice
 * @param microservice - The microservice
 * @returns A function that starts a microservice
 */
export const start = async (provider: Provider<Dependencies, Microservice>, config: MicroserviceConfig): Promise<Microservice> => {
  const dependencies = {
    httpProvider: http.providers.registry.get(config.http.provider),
    loggingProvider: logging.providers.registry.get(config.logging.provider),
  };
  const microservice = provider.resolve(dependencies);
  if (microservice.httpServer) {
    await microservice.httpServer.start();
    return microservice;
  }
  return microservice;
};

/**
 * Stops a microservice
 * @param microservice - The microservice
 * @returns A function that stops a microservice
 */
export const stop = async (microservice: Microservice): Promise<Microservice> => {
  if (microservice.httpServer) {
    await microservice.httpServer.stop();
    return microservice;
  }
  return Promise.resolve(microservice);
};
