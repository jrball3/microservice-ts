import express from 'express';
import { observability, http } from '@jrball3/microservice-ts';
import * as optsNS from './opts';

/**
 * Gets the request
 * @param req - The express request
 * @returns - The request
 */
const getRequest = (req: express.Request): http.routeHandler.Request => {
  const { headers, params, query, body } = req;
  return { headers, params, query, body };
};

/**
 * Dependencies for logging a request
 */
type EmitDependencies<D extends http.Dependencies = http.Dependencies> = {
  observabilityService: observability.ObservabilityService;
  config: http.config.HttpConfig<D>;
  route: http.RouteDefinition<D>;
  context: http.RequestContext;
};

/**
 * Logs a request
 * @param deps - The dependencies
 * @param request - The request
 */
const emitRequest = <D extends http.Dependencies = http.Dependencies>(deps: EmitDependencies<D>) => (request: http.routeHandler.Request): void => {
  const { config, route, context } = deps;
  const { method, path } = route;
  const logLevel = config.logging.logRequests[method];
  if (logLevel) {
    deps.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventSeverity: observability.eventSeverity.fromLogLevel(logLevel),
        eventName: 'http.request',
        eventScope: `${method} ${path}`,
        eventData: { ...context, request },
      }),
    );
  }
};

/**
 * Dependencies for handling a request
 */
type HandleRequestDependencies<D extends http.Dependencies = http.Dependencies> = {
  dependencies: D;
  context: http.RequestContext;
};

/**
 * Handles a request
 * @param deps - The dependencies
 * @returns - The handler response
 */
const handleRequest = <D extends http.Dependencies = http.Dependencies>(deps: HandleRequestDependencies<D>) =>
  (handler: http.routeHandler.RouteHandler<D>) =>
    async (handlerInput: http.routeHandler.Request): Promise<http.routeHandler.HandlerResponse> => {
      const { dependencies, context } = deps;
      let response: http.routeHandler.HandlerResponse;
      try {
        response = await handler(dependencies)(context, handlerInput);
      } catch (error) {
        response = {
          statusCode: 500,
          data: http.errors.toErrorResponse(error),
        };
      }
      return response;
    };

/**
 * Dependencies for processing a request
 */
type ProcessDependencies<D extends http.Dependencies = http.Dependencies> = {
  observabilityService: observability.ObservabilityService;
  context: http.RequestContext;
  config: http.config.HttpConfig<D>;
  dependencies: D;
  route: http.RouteDefinition<D>;
  opts?: optsNS.ExpressProviderOpts;
};

/**
 * Processes a request
 * @param deps - The dependencies
 * @returns - The processed request
 */
export const processRequest = <D extends http.Dependencies = http.Dependencies>(deps: ProcessDependencies<D>) =>
  (handler: http.routeHandler.RouteHandler<D>) =>
    async (req: express.Request): Promise<http.routeHandler.HandlerResponse> => {
      const request = getRequest(req);
      emitRequest(deps)(request);
      const handleRequestFn = handleRequest(deps)(handler);
      return handleRequestFn(request);
    };
