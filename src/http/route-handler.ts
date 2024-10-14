import { Dependencies } from './dependencies';
import { RequestContext } from './request-context';

/**
 * A handler response
 */
export type HandlerResponse = {
  statusCode: number;
  headers?: Record<string, string | string[] | undefined>;
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
(context: RequestContext, request: Request) => Promise<HandlerResponse>;

/**
 * A request parser
 */
export type RequestParser<ParsedRequest> = (dependencies: Dependencies) =>
(context: RequestContext, request: Request) => ParsedRequest | Promise<ParsedRequest>;

/**
 * A parsed request handler
 */
export type ParsedRequestHandler<ParsedRequest> = (dependencies: Dependencies) =>
(context: RequestContext, request: ParsedRequest) => Promise<HandlerResponse>;

/**
 * Creates a route handler
 * @param parseRequest - A function that parses the request
 * @param handleParsedRequest - A function that handles the parsed request
 * @returns A route handler
 */
export const create = <ParsedRequest>(
  parseRequest: RequestParser<ParsedRequest>,
  handleParsedRequest: ParsedRequestHandler<ParsedRequest>,
): RouteHandler =>
    (dependencies: Dependencies) =>
      async (context: RequestContext, request: Request) => {
        const parsedRequest = await parseRequest(dependencies)(context, request);
        return handleParsedRequest(dependencies)(context, parsedRequest);
      };
