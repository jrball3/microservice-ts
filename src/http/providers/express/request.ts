import express from 'express';
import * as events from '../../../events';
import * as logging from '../../../logging';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import { toErrorResponse } from '../../errors';
import { RequestContext } from '../../request-context';
import { HandlerResponse, Request, RouteHandler } from '../../route-handler';
import * as optsNS from './opts';
import { RouteDefinition } from '../../route-definition';

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
type LogDependencies<D extends Dependencies = Dependencies> = {
  logger: logging.Logger;
  config: configNS.HttpConfig<D>;
  route: RouteDefinition<D>;
  context: RequestContext;
};

/**
 * Logs a request
 * @param deps - The dependencies
 * @param request - The request
 */
const logRequest = <D extends Dependencies = Dependencies>(deps: LogDependencies<D>) => (request: Request): void => {
  const { logger, config, route, context } = deps;
  const { method, path } = route;
  const logLevel = config.logging.logRequests[method];
  if (logLevel) {
    logging.events.logEvent(logger)(
      logLevel,
      events.event({
        eventType: 'http request',
        eventName: `${method} ${path}`,
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
  context: RequestContext;
  logger: logging.Logger;
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
      logRequest(deps)(request);
      const handleRequestFn = handleRequest(deps)(handler);
      return handleRequestFn(request);
    };
