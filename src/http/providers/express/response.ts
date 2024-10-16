import express from 'express';
import * as events from '../../../events';
import * as logging from '../../../logging';
import * as configNS from '../../config';
import { RequestContext } from '../../request-context';
import { RouteDefinition } from '../../route-definition';
import { HandlerResponse } from '../../route-handler';
import { Dependencies } from '../../dependencies';

type ProcessResponseDependencies<D extends Dependencies = Dependencies> = {
  config: configNS.HttpConfig<D>;
  context?: RequestContext;
  logger: logging.Logger;
  route: RouteDefinition<D>;
};

const sendResponse = (
  res: express.Response,
  next: express.NextFunction,
): ((response: HandlerResponse) => void) =>
  (response: HandlerResponse): void => {
    res.set(response.headers).status(response.statusCode).json(response.data);
    next();
  };

const logResponse = <D extends Dependencies = Dependencies>(deps: ProcessResponseDependencies<D>) => 
  (response: HandlerResponse): void => {
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

/**
 * Processes a response
 * @param deps - The dependencies
 * @returns - The processed response
 */
export const processResponse = <D extends Dependencies = Dependencies>(deps: ProcessResponseDependencies<D>) =>
  (res: express.Response, next: express.NextFunction): ((response: HandlerResponse) => void) =>
    (response: HandlerResponse): void => {
      logResponse(deps)(response);
      sendResponse(res, next)(response);
    };
