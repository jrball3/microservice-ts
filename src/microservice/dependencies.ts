import * as events from '../events';
import * as http from '../http';
import * as logging from '../logging';

/**
 * The dependencies for the microservice
 */
export type Dependencies = {
  httpServer?: http.HttpServer;
  logger?: logging.Logger;
  eventConsumers?: Record<string, events.consumer.EventConsumer>;
};
