import * as http from "./http";

/**
 * A microservice configuration
 */
export type MicroserviceConfig = {
  http: http.config.HttpConfig;
}

