import { asFunction, createContainer } from 'awilix';
import express from 'express';
import { http, logging, messaging, microservice, observability } from '@jrball3/microservice-ts';
import * as mstsExpress from '@jrball3/microservice-ts-http-express';
import * as mstsLogging from '@jrball3/microservice-ts-logging-console';
import * as mstsConsumer from '@jrball3/microservice-ts-messaging-kafka-consumer';
import * as mstsProducer from '@jrball3/microservice-ts-messaging-kafka-producer';
import * as mstsObservability from '@jrball3/microservice-ts-observability-service';

const createApp = (): express.Application => {
  // Construct the express app
  const app = express();

  // Construct some application middleware
  const appMiddleware = (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).appliedAppMiddleware = true;
    next();
  };

  // Apply the application middleware
  app.use(appMiddleware);

  return app;
};


const createRoutes = (): mstsExpress.ExpressRouteDefinition[] => {
  // Construct some native express middleware for one route
  const getMiddleware = (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).appliedRouteMiddleware = true;
    next();
  };

  // Construct a route handler for a GET route
  type ParsedRequest = {
    parsed: boolean;
    data: {
      message: string;
    };
  };

  const parseRequest = (_dependencies: http.Dependencies) =>
    (
      _context: http.RequestContext,
      _request: http.routeHandler.Request,
    ): ParsedRequest => ({
      parsed: true,
      data: { message: 'Hello, world!' },
    });

  const handleParsedRequest = (_dependencies: http.Dependencies) =>
    async (
      _context: http.RequestContext,
      _request: ParsedRequest,
    ): Promise<http.routeHandler.HandlerResponse> => ({
      statusCode: 200,
      data: { message: 'Hello, world!' },
    });

  const getHandler: http.routeHandler.RouteHandler = http.routeHandler.create(
    parseRequest,
    handleParsedRequest,
  );

  // Construct a route for a GET route
  const getRoute: mstsExpress.ExpressRouteDefinition = {
    path: '/',
    method: http.HttpMethod.GET,
    middleware: [getMiddleware],
    handler: getHandler,
  };

  return [getRoute];
};

const createHttpConfig = (routes: mstsExpress.ExpressRouteDefinition[]): http.config.HttpConfig => {
  // Construct the HTTP server configuration
  const httpConfig: http.config.HttpConfig = {
    host: 'localhost',
    port: 3000,
    logging: {
      logRequests: {
        get: logging.LogLevel.INFO,
        post: logging.LogLevel.INFO,
      },
      logResponses: {
        200: logging.LogLevel.INFO,
        400: logging.LogLevel.WARN,
        500: logging.LogLevel.ERROR,
      },
    },
    routes,
  };

  return httpConfig;
};

const createLoggingConfig = (): logging.config.LoggingConfig => {
  // Define the logging configuration, required for an http microservice
  const loggingConfig: logging.config.LoggingConfig = {
    level: logging.LogLevel.INFO,
  };

  return loggingConfig;
};

const createEventConsumers = (): Record<string, mstsConsumer.KafkaConsumerConfig> => ({
  kafkaConsumer: {
    clientId: 'kafka-consumer',
    brokers: ['localhost:9092'],
    groupId: 'kafka-group',
    subscribeTopics: {
      topics: ['test-topic'],
    },
    runConfig: {
      eachMessage: (dependencies: messaging.consumer.Dependencies) => 
        async (message) => {
          dependencies.observabilityService.emit({
            eventType: observability.EventType.READ,
            eventName: 'event.consumer.message.read',
            eventSeverity: observability.eventSeverity.EventSeverity.INFO,
            eventScope: 'event.consumer',
            eventTimestamp: new Date(),
            eventData: {
              message,
            },
          });
        },
    },
  },
});

const createEventProducers = (): Record<string, mstsProducer.KafkaProducerConfig> => ({
  kafkaProducer: {
    config: {
      clientId: 'kafka-producer',
      brokers: ['localhost:9092'],
    },
    producerConfig: {
      allowAutoTopicCreation: true,
    },
  },
});

const createMicroserviceConfig = (
  httpConfig: http.config.HttpConfig,
  loggingConfig: logging.config.LoggingConfig,
  eventConsumers: Record<string, mstsConsumer.KafkaConsumerConfig>,
  eventProducers: Record<string, mstsProducer.KafkaProducerConfig>,
): microservice.MicroserviceConfig<mstsConsumer.KafkaConsumerConfig, mstsProducer.KafkaProducerConfig> => {
  // Construct the microservice configuration
  const config: microservice.MicroserviceConfig<mstsConsumer.KafkaConsumerConfig, mstsProducer.KafkaProducerConfig> = {
    http: httpConfig,
    logging: loggingConfig,
    eventConsumers,
    eventProducers,
  };
  return config;
};


export const resolveMicroservice = (
  app: express.Application,
  config: microservice.MicroserviceConfig<mstsConsumer.KafkaConsumerConfig, mstsProducer.KafkaProducerConfig>,
): microservice.Microservice => {
  // Construct a function that extracts request context from the request
  const extractRequestContext = (req: express.Request): Record<string, unknown> => ({
    extractedRequestContext: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliedAppMiddleware: (req as any).appliedAppMiddleware,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliedRouteMiddleware: (req as any).appliedRouteMiddleware,
  });

  // Construct the logging provider
  const loggingProvider = mstsLogging.createProvider(config.logging);

  // Construct the http server provider
  const opts = { extractRequestContext };
  const httpProvider = mstsExpress.server.createProvider(app, config.http, opts);

  // Construct the kafka consumers provider
  const kafkaConsumerConfig = config.eventConsumers.kafkaConsumer;
  if (!kafkaConsumerConfig) {
    throw new Error('Kafka consumer config is not defined');
  }
  const kafkaConsumerProvider = mstsConsumer.createProvider(kafkaConsumerConfig);
  const kafkaConsumersProvider = mstsConsumer.createMultiProvider({
    kafkaConsumer: kafkaConsumerProvider,
  });

  // Construct the kafka producers provider
  const kafkaProducerConfig = config.eventProducers.kafkaProducer;
  if (!kafkaProducerConfig) {
    throw new Error('Kafka producer config is not defined');
  }
  const kafkaProducerProvider = mstsProducer.createProvider(kafkaProducerConfig);
  const kafkaProducersProvider = mstsProducer.createMultiProvider({
    kafkaProducer: kafkaProducerProvider,
  });

  // Construct the observability service provider
  const observabilityProvider = mstsObservability.createProvider();

  // Construct the microservice provider
  const onStart = (_dependencies: microservice.Dependencies): Promise<boolean> => Promise.resolve(true);
  const onStop = (_dependencies: microservice.Dependencies): Promise<boolean> => Promise.resolve(true);
  const microserviceProvider = microservice.createProvider(
    onStart,
    onStop,
  );
  const container = createContainer<microservice.Dependencies & { microservice: microservice.Microservice }>();
  
  // Register providers
  container.register({
    logger: asFunction(loggingProvider).singleton(),
    httpServer: asFunction(httpProvider).singleton(),
    eventConsumers: asFunction(kafkaConsumersProvider).singleton(),
    eventProducers: asFunction(kafkaProducersProvider).singleton(),
    observabilityService: asFunction(observabilityProvider).singleton(),
    microservice: asFunction(microserviceProvider).singleton(),
  });
  
  // Resolve the microservice
  return container.resolve<microservice.Microservice>('microservice');
};

const main = async (): Promise<void> => {
  const app = createApp();
  const routes = createRoutes();
  const httpConfig = createHttpConfig(routes);
  const loggingConfig = createLoggingConfig();
  const eventConsumers = createEventConsumers();
  const eventProducers = createEventProducers();
  const microserviceConfig = createMicroserviceConfig(httpConfig, loggingConfig, eventConsumers, eventProducers);
  const service = resolveMicroservice(app, microserviceConfig);
  await service.start();
};

main();
