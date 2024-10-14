import * as http from '../http';
import * as logging from '../logging';
/**
 * A microservice configuration
 */
export type MicroserviceConfig = {
  http: http.config.HttpConfig;
  logging: logging.config.LoggingConfig;
};
