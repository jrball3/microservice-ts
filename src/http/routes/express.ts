import express from "express";
import { Dependencies } from "../../dependencies";
import * as events from "../../events";
import * as logger from "../../logger";
import * as config from "../config";
import { toErrorResponse } from "../errors";
import { RequestContext } from "../request-context";
import * as reqId from "../utils/request-id";
import { HandlerResponse, Request, RouteHandler } from "./handler";

const getEventLogger = (dependencies: Dependencies): logger.events.EventLogger => dependencies.eventLogger;

const getRequest = (req: express.Request): Request => {
  const { headers, params, query, body } = req;
  return { headers, params, query, body };
}

const getContext = (route: config.RouteConfig, req: express.Request): RequestContext => {
  const { path, method } = route;
  const requestId = req.headers["x-request-id"]?.[0] ?? reqId.generate();
  return { requestId, path, method };
}

type LogDependencies = {
  config: config.HttpConfig;
  route: config.RouteConfig;
  context: RequestContext;
  eventLogger: logger.events.EventLogger;
}

const logRequest = (deps: LogDependencies) => (request: Request) => {
  const { config, route, context, eventLogger } = deps;
  const { method, path } = route;
  const logLevel = config.logging.logRequests[method];
  if (logLevel) {
    eventLogger.log(
      logLevel,
      events.event({
        eventType: 'http request',
        eventName: `${method} ${path}`,
        eventData: { ...context, request },
      }),
    );
  }
}

const logResponse = (deps: LogDependencies) => (response: HandlerResponse) => {
  const { config, route, context, eventLogger } = deps;
  const { method, path } = route;
  const logLevel = config.logging.logResponses[response.code];
  if (logLevel) {
    eventLogger.log(
      logLevel,
      events.event({
        eventType: 'http response',
        eventName: `${method} ${path}`,
        eventData: { ...context, response },
      }),
    );
  }
}

const handleRequest = (
  dependencies: Dependencies,
  context: RequestContext,
  handler: RouteHandler,
) => async (handlerInput: Request): Promise<HandlerResponse> => {
  let response: HandlerResponse;
  try {
    response = await handler(dependencies)(context)(handlerInput);
  } catch (error) {
    response = {
      code: 500,
      data: toErrorResponse(error),
    };
  };
  return response;
}

const sendResponse = (
  res: express.Response,
  next: express.NextFunction,
) => (response: HandlerResponse) => {
  res.set(response.headers).status(response.code).json(response.data);
  next();
}

type WrapHandlerDependencies = {
  config: config.HttpConfig;
  dependencies: Dependencies;
  route: config.RouteConfig;
}

const wrapHandler = (deps: WrapHandlerDependencies) =>
  (handler: RouteHandler): express.RequestHandler =>
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const { config, dependencies, route } = deps;
      const request = getRequest(req);
      const context = getContext(route, req);
      const eventLogger = getEventLogger(dependencies);
      const logDeps = { config, route, context, eventLogger };
      logRequest(logDeps)(request);
      const response = await handleRequest(dependencies, context, handler)(request);
      logResponse(logDeps)(response);
      sendResponse(res, next)(response);
    };

export const apply = (dependencies: Dependencies) =>
  (config: config.HttpConfig) =>
    (app: express.Application) => {
      config.routes.forEach((route) => {
        const { path, method, handler } = route;
        const wrapHandlerDeps = { config, dependencies, route };
        app[method](path, wrapHandler(wrapHandlerDeps)(handler));
      });
      return app;
    }
