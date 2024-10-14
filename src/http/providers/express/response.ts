import express from 'express';
import * as events from '../../../events';
import * as logging from '../../../logging';
import * as configNS from '../../config';
import { RequestContext } from '../../request-context';
import { RouteDefinition } from '../../route-definition';
import { HandlerResponse } from '../../route-handler';

type ProcessResponseDependencies = {
  config: configNS.HttpConfig;
  context?: RequestContext;
  logger: logging.Logger;
  route: RouteDefinition;
};

const sendResponse = (
  res: express.Response,
  next: express.NextFunction,
): ((response: HandlerResponse) => void) =>
  (response: HandlerResponse): void => {
    res.set(response.headers).status(response.statusCode).json(response.data);
    next();
  };

const logResponse = (deps: ProcessResponseDependencies) => (response: HandlerResponse): void => {
  const { logger, config, route, context } = deps;
  const { method, path } = route;
  const logLevel = config.logging.logResponses[response.statusCode];
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

export const processResponse = (deps: ProcessResponseDependencies) =>
  (res: express.Response, next: express.NextFunction): ((response: HandlerResponse) => void) =>
    (response: HandlerResponse): void => {
      logResponse(deps)(response);
      sendResponse(res, next)(response);
    };
