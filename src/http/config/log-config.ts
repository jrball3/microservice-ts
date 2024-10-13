import * as logger from "../../logging";
import { HttpMethod } from "../method";

/**
 * Logging configuration
 */
export type LogConfig = {
  logRequests: { [k in HttpMethod]?: logger.LogLevel };
  logResponses: { [k: number]: logger.LogLevel };
};
