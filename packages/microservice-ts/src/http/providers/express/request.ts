import express from 'express';
import * as observability from '../../../observability';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import { toErrorResponse } from '../../errors';
import { RequestContext } from '../../request-context';
import { RouteDefinition } from '../../route-definition';
import { HandlerResponse, Request, RouteHandler } from '../../route-handler';
import * as optsNS from './opts';

/**
 * Gets the request
 * @param req - The express request
 * @returns - The request
 */
const getRequest = (req: express.Request): Request => {
  const { headers, params, query, body } = req;
  return { headers, params, query, body };
};

/**
 * Dependencies for logging a request
 */
type EmitDependencies<D extends Dependencies = Dependencies> = {
  observabilityService: observability.ObservabilityService;
  config: configNS.HttpConfig<D>;
  route: RouteDefinition<D>;
  context: RequestContext;
};

/**
 * Logs a request
 * @param deps - The dependencies
 * @param request - The request
 */
const emitRequest = <D extends Dependencies = Dependencies>(deps: EmitDependencies<D>) => (request: Request): void => {
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
type HandleRequestDependencies<D extends Dependencies = Dependencies> = {
  dependencies: D;
  context: RequestContext;
};

/**
 * Handles a request
 * @param deps - The dependencies
 * @returns - The handler response
 */
const handleRequest = <D extends Dependencies = Dependencies>(deps: HandleRequestDependencies<D>) =>
  (handler: RouteHandler<D>) =>
    async (handlerInput: Request): Promise<HandlerResponse> => {
      const { dependencies, context } = deps;
      let response: HandlerResponse;
      try {
        response = await handler(dependencies)(context, handlerInput);
      } catch (error) {
        response = {
          statusCode: 500,
          data: toErrorResponse(error),
        };
      }
      return response;
    };

/**
 * Dependencies for processing a request
 */
type ProcessDependencies<D extends Dependencies = Dependencies> = {
  observabilityService: observability.ObservabilityService;
  context: RequestContext;
  config: configNS.HttpConfig<D>;
  dependencies: D;
  route: RouteDefinition<D>;
  opts?: optsNS.ExpressProviderOpts;
};

/**
 * Processes a request
 * @param deps - The dependencies
 * @returns - The processed request
 */
export const processRequest = <D extends Dependencies = Dependencies>(deps: ProcessDependencies<D>) =>
  (handler: RouteHandler<D>) =>
    async (req: express.Request): Promise<HandlerResponse> => {
      const request = getRequest(req);
      emitRequest(deps)(request);
      const handleRequestFn = handleRequest(deps)(handler);
      return handleRequestFn(request);
    };
