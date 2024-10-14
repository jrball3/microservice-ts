import * as express from 'express';
import * as os from 'os';
import * as providers from '..';
import { RequestContext } from '../../request-context';
import { RouteDefinition } from '../../route-definition';
import * as utils from '../../utils';

/**
 * Creates a request context
 * @param route - The route config
 * @param opts - The options
 * @returns A function that creates a request context
 */
export const createRequestContext = (
  route: RouteDefinition,
  opts?: providers.express.opts.ExpressProviderOpts,
) =>
  (req: express.Request): RequestContext => {
    const { path, method } = route;
    const requestId = req.headers['x-request-id']?.[0] ?? utils.requestId.generate();
    const hostname = os.hostname();
    const ip = req.ip ?? '';
    return {
      requestId,
      url: req.url,
      path,
      hostname,
      ip,
      method,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      contentType: req.get('Content-Type'),
      acceptLanguage: req.get('Accept-Language'),
      ...(opts?.extractRequestContext?.(req)),
    };
  };
