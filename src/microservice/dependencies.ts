import * as http from '../http';
import * as logging from '../logging';
import * as messaging from '../messaging';
/**
 * The dependencies for the microservice
 */
export type Dependencies = {
  httpServer?: http.HttpServer;
  logger?: logging.Logger;
  eventConsumers?: Record<string, messaging.consumer.EventConsumer>;
  eventProducers?: Record<string, messaging.producer.EventProducer>;
};
