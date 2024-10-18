import { asFunction, createContainer } from 'awilix';
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

export type MicroserviceLifecycle<D extends Dependencies> = {
  onStarted: (dependencies: D) => Promise<boolean>;
  onStopped: (dependencies: D) => Promise<boolean>;
};

/**
 * Creates a microservice provider  
 * @returns A microservice provider
 */
const createProvider = <D extends Dependencies = Dependencies>(
  lifecycleConfig: MicroserviceLifecycle<D>,
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
        return lifecycleConfig.onStarted(dependencies);
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
        return lifecycleConfig.onStopped(dependencies);
      },
    };
  };
};

/**
 * Creates a microservice
 * @param lifecycleConfig The microservice lifecycle config
 * @param dependencyProviders The dependency providers
 * @returns A microservice
 */
export const createMicroservice = <D extends Dependencies = Dependencies>(
  lifecycleConfig: MicroserviceLifecycle<D>,
  dependencyProviders: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in keyof D]: di.Provider<any, unknown>;
  },
): Microservice => {
  const container = createContainer<D>();
  
  Object.entries(dependencyProviders).forEach(([key, provider]) => {
    container.register(key, asFunction(provider).singleton());
  });

  // Use Awilix to resolve all dependencies at once
  const deps = container.cradle;

  return createProvider(lifecycleConfig)(deps);
};
