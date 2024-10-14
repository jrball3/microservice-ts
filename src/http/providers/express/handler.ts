import express from 'express';
import * as events from '../../../events';
import * as logging from '../../../logging';
import * as configNS from '../../config';
import { Dependencies } from '../../dependencies';
import { toErrorResponse } from '../../errors';
import { RequestContext } from '../../request-context';
import { HandlerResponse, Request, RouteHandler } from '../../route-handler';
import * as optsNS from './opts';
import * as utils from './utils';

const getRequest = (req: express.Request): Request => {
  const { headers, params, query, body } = req;
  return { headers, params, query, body };
};

type LogDependencies = {
  logger: logging.Logger;
  config: configNS.HttpConfig;
  route: configNS.RouteConfig;
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

const logResponse = (deps: LogDependencies) => (response: HandlerResponse): void => {
  const { logger, config, route, context } = deps;
  const { method, path } = route;
  const logLevel = config.logging.logResponses[response.code];
  if (logLevel) {
    logging.events.logEvent(logger)(
      logLevel,
      events.event({
        eventType: 'http response',
        eventName: `${method} ${path}`,
        eventData: { ...context, response },
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
        response = await handler(dependencies)(context)(handlerInput);
      } catch (error) {
        response = {
          code: 500,
          data: toErrorResponse(error),
        };
      }
      return response;
    };

const sendResponse = (
  res: express.Response,
  next: express.NextFunction,
): ((response: HandlerResponse) => void) =>
  (response: HandlerResponse): void => {
    res.set(response.headers).status(response.code).json(response.data);
    next();
  };

type WrapHandlerDependencies = {
  logger: logging.Logger;
  config: configNS.HttpConfig;
  dependencies: Dependencies;
  route: configNS.RouteConfig;
  opts?: optsNS.ExpressProviderOpts;
};

type ProcessDependencies = WrapHandlerDependencies & {
  context: RequestContext;
};

const processRequest = (deps: ProcessDependencies) =>
  (handler: RouteHandler) =>
    async (req: express.Request): Promise<HandlerResponse> => {
      const request = getRequest(req);
      logRequest(deps)(request);
      const handleRequestFn = handleRequest(deps)(handler);
      return handleRequestFn(request);
    };

const processResponse = (deps: ProcessDependencies) =>
  (res: express.Response, next: express.NextFunction): ((response: HandlerResponse) => void) =>
    (response: HandlerResponse): void => {
      logResponse(deps)(response);
      sendResponse(res, next)(response);
    };

export const wrapHandler = (deps: WrapHandlerDependencies) =>
  (handler: RouteHandler): express.RequestHandler =>
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const { route, opts } = deps;
      const context = utils.createRequestContext(route, opts)(req);
      const processRequestDeps = { ...deps, route, context };
      const response = await processRequest(processRequestDeps)(handler)(req);
      processResponse(processRequestDeps)(res, next)(response);
    };
