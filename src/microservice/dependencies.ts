import * as http from '../http';
import * as logging from '../logging';

/**
 * The dependencies for the microservice
 */
export type Dependencies = {
  httpServer?: http.HttpServer;
  logger?: logging.Logger;
};
