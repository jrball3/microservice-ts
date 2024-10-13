import { Dependencies } from './dependencies';
import { RequestContext } from './request-context';

/**
 * A handler response
 */
export type HandlerResponse = {
  code: number;
  headers?: Record<string, string>;
  data: unknown;
};

/**
 * A request headers
 */
export type RequestHeaders = { [key: string]: string | string[] | undefined };

/**
 * A request params
 */
export type RequestParams = { [key: string]: string };

/**
 * A request query
 */
export type RequestQuery = { [key: string]: string | string[] | undefined | RequestQuery | RequestQuery[] };

/**
 * A request
 */
export type Request = {
  headers: RequestHeaders;
  body: unknown;
  params: RequestParams;
  query: RequestQuery;
};

/**
 * A route handler
 */
export type RouteHandler = (dependencies: Dependencies) =>
(context: RequestContext) =>
(request: Request) =>
Promise<HandlerResponse>;
