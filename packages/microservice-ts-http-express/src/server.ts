import { di, http, observability } from '@jrball3/microservice-ts';
import express from 'express';
import nodehttp from 'http';
import { ExpressProviderOpts } from './opts';
import * as routes from './routes';

/**
 * Creates an HTTP provider
 * @param buildServerFn - The function that builds a server
 * @returns An HTTP provider
 */
export const createProvider = <D extends http.Dependencies = http.Dependencies>(
  app: express.Application,
  config: http.config.HttpConfig<D>,
  opts?: ExpressProviderOpts,
): di.Provider<D, http.HttpServer> =>
    (dependencies: D): http.HttpServer => {
      routes.apply(dependencies)(config)(app, opts);
      let server: nodehttp.Server | undefined;

      const start = async (): Promise<void> => {
        return new Promise((resolve) => {
          server = app.listen(config.port, config.host, () => {
            dependencies.observabilityService.emit(
              observability.event({ 
                eventType: observability.EventType.NOOP,
                eventName: 'http.server.express.start.success',
                eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
                eventScope: 'http.server.express',
                eventData: {
                  port: config.port,
                  host: config.host,
                },
              }),
            );
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
              dependencies.observabilityService.emit(
                observability.event({ 
                  eventType: observability.EventType.NOOP,
                  eventName: 'http.server.express.stop.error',
                  eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
                  eventScope: 'http.server.express',
                  eventData: {
                    error: err,
                  },
                }),
              );
              reject(err);
            } else {
              dependencies.observabilityService.emit(
                observability.event({ 
                  eventType: observability.EventType.NOOP,
                  eventName: 'http.server.express.stop.success',
                  eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
                  eventScope: 'http.server.express',
                  eventData: {
                    port: config.port,
                    host: config.host,
                  },
                }),
              );
              resolve();
            }
          });
        });
      };

      return {
        start,
        stop,
      };
    };
