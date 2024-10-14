import * as http from '../http';
import * as logging from '../logging';

export type Dependencies = {
  httpServer: http.HttpServer;
  logger: logging.Logger;
};
