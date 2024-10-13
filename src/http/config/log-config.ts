import * as logger from "../../logger";
import { HttpMethod } from "../method";

export type LogConfig = {
  logRequests: { [k in HttpMethod]?: logger.LogLevel };
  logResponses: { [k: number]: logger.LogLevel };
};
