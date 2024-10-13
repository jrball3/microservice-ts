import { Dependencies } from "../../dependencies";
import { RequestContext } from "../request-context";

export type HandlerResponse = {
  code: number;
  headers?: Record<string, string>;
  data: unknown;
}

export type RequestHeaders = { [key: string]: string | string[] | undefined };

export type RequestParams = { [key: string]: string };

export type RequestQuery = { [key: string]: string | string[] | RequestQuery | RequestQuery[] | undefined };

export type Request = {
  headers: RequestHeaders;
  body: unknown;
  params: RequestParams;
  query: RequestQuery;
}

export type RouteHandler = (dependencies: Dependencies) =>
  (context: RequestContext) =>
    (request: Request) =>
      Promise<HandlerResponse>;
