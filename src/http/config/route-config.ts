import { HttpMethod } from "../method";
import { RouteHandler } from "../routes/handler";

export type RouteConfig = {
  path: string;
  method: HttpMethod;
  handler: RouteHandler;
}
