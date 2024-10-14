import { Provider } from '../di/provider';
import { Dependencies } from './dependencies';

/**
 * A microservice
 */
export type Microservice = {
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
};

/**
 * Creates a microservice provider
 * @returns A microservice provider
 */
export const createProvider = (): Provider<Dependencies, Microservice> => {
  return {
    resolve: (dependencies): Microservice => {
      const { httpServer, logger } = dependencies;
      if (httpServer) {
        if (!logger) {
          throw new Error('Logging provider is required for HTTP microservices');
        }
      }
      return {
        start: async (): Promise<boolean> => {
          if (httpServer) {
            await httpServer.start();
          }
          return Promise.resolve(true);
        },
        stop: async (): Promise<boolean> => {
          if (httpServer) {
            await httpServer.stop();
          }
          return Promise.resolve(true);
        },
      };
    },
  };
};
