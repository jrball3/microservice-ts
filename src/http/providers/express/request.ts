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

const getRequest = (req: express.Request): Request => {
  const { headers, params, query, body } = req;
  return { headers, params, query, body };
};

type LogDependencies = {
  logger: logging.Logger;
  config: configNS.HttpConfig;
  route: RouteDefinition;
  context: RequestContext;
};

const logRequest = (deps: LogDependencies) => (request: Request): void => {
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


type HandleRequestDependencies = {
  dependencies: Dependencies;
  context: RequestContext;
};

const handleRequest = (deps: HandleRequestDependencies) =>
  (handler: RouteHandler) =>
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

type ProcessDependencies = {
  context: RequestContext;
  logger: logging.Logger;
  config: configNS.HttpConfig;
  dependencies: Dependencies;
  route: RouteDefinition;
  opts?: optsNS.ExpressProviderOpts;
};

/**
 * Processes a request
 * @param deps - The dependencies
 * @returns - The processed request
 */
export const processRequest = (deps: ProcessDependencies) =>
  (handler: RouteHandler) =>
    async (req: express.Request): Promise<HandlerResponse> => {
      const request = getRequest(req);
      logRequest(deps)(request);
      const handleRequestFn = handleRequest(deps)(handler);
      return handleRequestFn(request);
    };
