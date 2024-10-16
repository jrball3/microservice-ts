import express from 'express';
import { createContainer, asFunction } from 'awilix';
import { di, http, logger, microservice, messaging, observability } from '..';

type User = {
  id: string;
  name: string;
};

type Database = {
  initialize: () => Promise<boolean>;
  shutdown: () => Promise<boolean>;
  findUser: (id: string) => Promise<User | undefined>;
};

type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

const createDatabaseProvider = (_config: DatabaseConfig): di.Provider<unknown, Database> => () => ({
  initialize: (): Promise<boolean> => {
    return Promise.resolve(true);
  },
  shutdown: (): Promise<boolean> => {
    return Promise.resolve(true);
  },
  findUser: async (id: string): Promise<User | undefined> => {
    return { id, name: 'John Doe' };
  },
});

type ExtendedDependencies = {
  database: Database;
};

type ExtendedHttpDependencies = http.Dependencies & ExtendedDependencies;

type ExtendedMicroserviceDependencies = microservice.Dependencies & ExtendedDependencies;

type ExtendedEventConsumerDependencies = messaging.consumer.Dependencies & ExtendedDependencies;

type ExtendedMicroserviceConfig = microservice.MicroserviceConfig<ExtendedHttpDependencies, ExtendedEventConsumerDependencies> & {
  database: DatabaseConfig;
};

const createDatabaseConfig = (): DatabaseConfig => ({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

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

const createRoutes = (): http.providers.express.ExpressRouteDefinition<ExtendedHttpDependencies>[] => {
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

  const parseRequest = (_dependencies: ExtendedHttpDependencies) =>
    (
      _context: http.RequestContext,
      _request: http.routeHandler.Request,
    ): ParsedRequest => ({
      parsed: true,
      data: { message: 'Hello, world!' },
    });

  const handleParsedRequest = (_dependencies: ExtendedHttpDependencies) =>
    async (
      _context: http.RequestContext,
      _request: ParsedRequest,
    ): Promise<http.routeHandler.HandlerResponse> => ({
      statusCode: 200,
      data: { message: 'Hello, world!' },
    });

  const getHandler: http.routeHandler.RouteHandler<ExtendedHttpDependencies> = http.routeHandler.create(
    parseRequest,
    handleParsedRequest,
  );

  // Construct a route for a GET route
  const getRoute: http.providers.express.ExpressRouteDefinition<ExtendedHttpDependencies> = {
    path: '/',
    method: http.HttpMethod.GET,
    middleware: [getMiddleware],
    handler: getHandler,
  };

  return [getRoute];
};

const createHttpConfig = (routes: http.providers.express.ExpressRouteDefinition<ExtendedHttpDependencies>[]): http.config.HttpConfig<ExtendedHttpDependencies> => {
  // Construct the HTTP server configuration
  const httpConfig: http.config.HttpConfig<ExtendedHttpDependencies> = {
    host: 'localhost',
    port: 3000,
    logging: {
      logRequests: {
        get: logger.LogLevel.INFO,
        post: logger.LogLevel.INFO,
      },
      logResponses: {
        200: logger.LogLevel.INFO,
        400: logger.LogLevel.WARN,
        500: logger.LogLevel.ERROR,
      },
    },
    routes,
  };

  return httpConfig;
};

const createLoggingConfig = (): logger.config.LoggingConfig => {
  // Define the logging configuration, required for an http microservice
  const loggingConfig: logger.config.LoggingConfig = {
    level: logger.LogLevel.INFO,
  };

  return loggingConfig;
};

const createEventConsumers = (): Record<string, messaging.consumer.config.EventConsumerConfig<ExtendedEventConsumerDependencies>> => ({
  kafkaConsumer: {
    clientId: 'kafka-consumer',
    brokers: ['localhost:9092'],
    groupId: 'kafka-group',
    subscribeTopics: {
      topics: ['test-topic'],
    },
    runConfig: {
      eachMessage: (dependencies: ExtendedEventConsumerDependencies) => 
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

const createEventProducers = (): Record<string, messaging.producer.config.EventProducerConfig> => ({
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
  databaseConfig: DatabaseConfig,
  httpConfig: http.config.HttpConfig<ExtendedHttpDependencies>,
  loggingConfig: logger.config.LoggingConfig,
  eventConsumers: Record<string, messaging.consumer.config.EventConsumerConfig<ExtendedEventConsumerDependencies>>,
  eventProducers: Record<string, messaging.producer.config.EventProducerConfig>,
): ExtendedMicroserviceConfig => ({
  database: databaseConfig,
  http: httpConfig,
  logging: loggingConfig,
  eventConsumers,
  eventProducers,
});

export const resolveMicroservice = (
  app: express.Application,
  config: ExtendedMicroserviceConfig,
): microservice.Microservice => {
  // Construct a function that extracts request context from the request
  const extractRequestContext = (req: express.Request): Record<string, unknown> => ({
    extractedRequestContext: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliedAppMiddleware: (req as any).appliedAppMiddleware,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliedRouteMiddleware: (req as any).appliedRouteMiddleware,
  });

  // Construct the logger provider
  const loggerProvider = logger.providers.console.createProvider(config.logging);

  // Construct the http server provider
  const opts = { extractRequestContext };
  const httpProvider = http.providers.express.server.createProvider(app, config.http, opts);

  // Construct the kafka consumers provider
  const kafkaConsumerConfig = config.eventConsumers.kafkaConsumer;
  if (!kafkaConsumerConfig) {
    throw new Error('Kafka consumer config is not defined');
  }
  const kafkaConsumerProvider = messaging.consumer.providers.kafka.createProvider(kafkaConsumerConfig);
  const kafkaConsumersProvider = messaging.consumer.providers.kafka.createMultiProvider({
    kafkaConsumer: kafkaConsumerProvider,
  });

  // Construct the kafka producers provider
  const kafkaProducerConfig = config.eventProducers.kafkaProducer;
  if (!kafkaProducerConfig) {
    throw new Error('Kafka producer config is not defined');
  }
  const kafkaProducerProvider = messaging.producer.providers.kafka.createProvider(kafkaProducerConfig);
  const kafkaProducersProvider = messaging.producer.providers.kafka.createMultiProvider({
    kafkaProducer: kafkaProducerProvider,
  });

  // Construct the database provider
  const databaseProvider = createDatabaseProvider(config.database);

  // Construct the observability service provider
  const observabilityProvider = observability.providers.service.createProvider();

  // Construct the microservice provider
  const microserviceProvider: di.Provider<ExtendedMicroserviceDependencies, microservice.Microservice> =
    microservice.createProvider<ExtendedMicroserviceDependencies>(
      async (dependencies: ExtendedMicroserviceDependencies) => {
        await dependencies.database.initialize();
        return true;
      },
      async (dependencies: ExtendedMicroserviceDependencies) => {
        await dependencies.database.shutdown();
        return true;
      },
    );
  
  // Register providers
  const container = createContainer<ExtendedMicroserviceDependencies & { microservice: microservice.Microservice }>();
  container.register({
    logger: asFunction(loggerProvider).singleton(),
    httpServer: asFunction(httpProvider).singleton(),
    eventConsumers: asFunction(kafkaConsumersProvider).singleton(),
    eventProducers: asFunction(kafkaProducersProvider).singleton(),
    observabilityService: asFunction(observabilityProvider).singleton(),
    database: asFunction(databaseProvider).singleton(),
    microservice: asFunction(microserviceProvider).singleton(),
  });
  
  // Resolve the microservice
  return container.resolve<microservice.Microservice>('microservice');
};

const main = async (): Promise<void> => {
  const app = createApp();
  const routes = createRoutes();
  const databaseConfig = createDatabaseConfig();
  const httpConfig = createHttpConfig(routes);
  const loggingConfig = createLoggingConfig();
  const eventConsumers = createEventConsumers();
  const eventProducers = createEventProducers();
  const microserviceConfig = createMicroserviceConfig(databaseConfig, httpConfig, loggingConfig, eventConsumers, eventProducers);
  const service = resolveMicroservice(app, microserviceConfig);
  await service.start();
};

main();