import * as di from '../di';
import * as observability from '../observability';
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
export const createProvider = <D extends Dependencies = Dependencies>(
  onStart: (dependencies: D) => Promise<boolean>,
  onStop: (dependencies: D) => Promise<boolean>,
): di.Provider<D, Microservice> => {
  return (dependencies: D): Microservice => {
    const { httpServer, logger, eventConsumers, eventProducers, observabilityService } = dependencies;
    if (httpServer) {
      if (!logger) {
        throw new Error('Logging provider is required for HTTP microservices');
      }
    }
    if (observabilityService) {
      if (logger) {
        observabilityService.on({}, observability.logging.logEvent(logger));
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
        if (eventProducers) {
          for (const producer of Object.values(eventProducers)) {
            await producer.connect();
          }
        }
        return onStart(dependencies);
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
        if (eventProducers) {
          for (const producer of Object.values(eventProducers)) {
            await producer.disconnect();
          }
        }
        return onStop(dependencies);
      },
    };
  };
};
