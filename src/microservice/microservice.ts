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
      const { httpServer, logger, eventConsumers } = dependencies;
      if (httpServer) {
        if (!logger) {
          throw new Error('Logging provider is required for HTTP microservices');
        }
      }
      if (eventConsumers && Object.keys(eventConsumers).length > 0) {
        if (!logger) {
          throw new Error('Logging provider is required for event consumers');
        }
      }
      return {
        start: async (): Promise<boolean> => {
          if (httpServer) {
            await httpServer.start();
          }
          if (eventConsumers) {
            for (const consumer of Object.values(eventConsumers)) {
              await consumer.connect();
              await consumer.start();
            }
          }
          return Promise.resolve(true);
        },
        stop: async (): Promise<boolean> => {
          if (httpServer) {
            await httpServer.stop();
          }
          if (eventConsumers) {
            for (const consumer of Object.values(eventConsumers)) {
              await consumer.stop();
              await consumer.disconnect();
            }
          }
          return Promise.resolve(true);
        },
      };
    },
  };
};
