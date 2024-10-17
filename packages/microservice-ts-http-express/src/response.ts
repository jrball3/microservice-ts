import express from 'express';
import { observability, http } from '@jrball3/microservice-ts';

type ProcessResponseDependencies<D extends http.Dependencies = http.Dependencies> = {
  observabilityService: observability.ObservabilityService;
  config: http.config.HttpConfig<D>;
  context?: http.RequestContext;
  route: http.RouteDefinition<D>;
};

const sendResponse = (
  res: express.Response,
  next: express.NextFunction,
): ((response: http.routeHandler.HandlerResponse) => void) =>
  (response: http.routeHandler.HandlerResponse): void => {
    res.set(response.headers).status(response.statusCode).json(response.data);
    next();
  };

const logResponse = <D extends http.Dependencies = http.Dependencies>(deps: ProcessResponseDependencies<D>) => 
  (response: http.routeHandler.HandlerResponse): void => {
    const { config, route, context } = deps;
    const { method, path } = route;
    const logLevel = config.logging.logResponses[response.statusCode];
    if (logLevel) {
      deps.observabilityService.emit(
        observability.event({
          eventType: observability.EventType.NOOP,
          eventSeverity: observability.eventSeverity.fromLogLevel(logLevel),
          eventName: 'http.response',
          eventScope: `${method} ${path}`,
          eventData: { ...context, response },
        }),
      );
    }
  };

/**
 * Processes a response
 * @param deps - The dependencies
 * @returns - The processed response
 */
export const processResponse = <D extends http.Dependencies = http.Dependencies>(deps: ProcessResponseDependencies<D>) =>
  (res: express.Response, next: express.NextFunction): ((response: http.routeHandler.HandlerResponse) => void) =>
    (response: http.routeHandler.HandlerResponse): void => {
      logResponse(deps)(response);
      sendResponse(res, next)(response);
    };
