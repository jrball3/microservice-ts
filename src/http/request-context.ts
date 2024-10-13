import { HttpMethod } from "./method";

export type RequestContext = {
  requestId: string;
  path: string;
  method: HttpMethod;
}
