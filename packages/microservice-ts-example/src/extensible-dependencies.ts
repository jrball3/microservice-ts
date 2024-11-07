import { di, http, logging, messaging, microservice, observability } from '@jrball3/microservice-ts';
import * as mstsExpress from '@jrball3/microservice-ts-http-express';
import * as mstsLogging from '@jrball3/microservice-ts-logging-console';
import * as mstsConsumer from '@jrball3/microservice-ts-messaging-kafka-consumer';
import * as mstsProducer from '@jrball3/microservice-ts-messaging-kafka-producer';
import * as mstsJobService from '@jrball3/microservice-ts-job-service-bullmq';
import * as mstsRetryDlq from '@jrball3/microservice-ts-messaging-retry-dlq-bullmq';
import * as mstsObservability from '@jrball3/microservice-ts-observability-service';

import express from 'express';

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

type ExtendedMicroserviceDependencies = microservice.Dependencies<mstsJobService.QueueConfig> & ExtendedDependencies;

type ExtendedEventConsumerDependencies = messaging.consumer.Dependencies & ExtendedDependencies;

type ExtendedMicroserviceConfig = microservice.MicroserviceConfig<
  ExtendedHttpDependencies,
  mstsConsumer.KafkaConsumerConfig<ExtendedEventConsumerDependencies>,
  mstsProducer.KafkaProducerConfig,
  mstsJobService.JobServiceConfig,
  messaging.retryDlq.RetryDlqConfig<mstsJobService.QueueConfig, mstsJobService.AddQueueResult, messaging.retryDlq.Dependencies<mstsJobService.QueueConfig, mstsJobService.AddQueueResult>, any>
> & {
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

const createRoutes = (): mstsExpress.ExpressRouteDefinition<ExtendedHttpDependencies>[] => {
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
  const getRoute: mstsExpress.ExpressRouteDefinition<ExtendedHttpDependencies> = {
    path: '/',
    method: http.HttpMethod.GET,
    middleware: [getMiddleware],
    handler: getHandler,
  };

  return [getRoute];
};

const createHttpConfig = (routes: mstsExpress.ExpressRouteDefinition<ExtendedHttpDependencies>[]): http.config.HttpConfig<ExtendedHttpDependencies> => {
  // Construct the HTTP server configuration
  const httpConfig: http.config.HttpConfig<ExtendedHttpDependencies> = {
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

const createEventConsumers = (): Record<string, mstsConsumer.KafkaConsumerConfig<ExtendedEventConsumerDependencies>> => ({
  exampleConsumer: {
    kafka: {
      clientId: 'kafka-consumer',
      brokers: ['localhost:9092'],
    },
    consumer: {
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
  },
});

const createEventProducers = (): Record<string, mstsProducer.KafkaProducerConfig> => ({
  kafkaProducer: {
    kafka: {
      clientId: 'kafka-producer',
      brokers: ['localhost:9092'],
    },
    producer: {
      allowAutoTopicCreation: true,
    },
  },
});

const createJobServiceConfig = (): mstsJobService.JobServiceConfig => ({
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

const createRetryDlqConfig = (): Record<string, messaging.retryDlq.RetryDlqConfig<mstsJobService.QueueConfig, mstsJobService.AddQueueResult, messaging.retryDlq.Dependencies<mstsJobService.QueueConfig, mstsJobService.AddQueueResult>, any>> => ({
  exampleConsumerDlq: {
    identifier: {
      topic: 'test-retry-dlq',
      consumerGroup: 'test-consumer-group',
    },
    attempts: 3,
    handler: (dependencies: messaging.retryDlq.Dependencies<mstsJobService.QueueConfig, mstsJobService.AddQueueResult>) =>
      async (message: any) => {
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
  exampleProducerDlq: {
    identifier: {
      producer: 'test-producer',
    },
    attempts: 3,
    handler: (dependencies: messaging.retryDlq.Dependencies<mstsJobService.QueueConfig, mstsJobService.AddQueueResult>) =>
      async (message: any) => {
        dependencies.observabilityService.emit({
          eventType: observability.EventType.WRITE,
          eventName: 'event.producer.message.write',
          eventSeverity: observability.eventSeverity.EventSeverity.INFO,
          eventScope: 'event.producer',
          eventTimestamp: new Date(),
          eventData: {
            message,
          },
        });
      },
  },
});

const createMicroserviceConfig = (
  databaseConfig: DatabaseConfig,
  httpConfig: http.config.HttpConfig<ExtendedHttpDependencies>,
  loggingConfig: logging.config.LoggingConfig,
  eventConsumers: Record<string, mstsConsumer.KafkaConsumerConfig<ExtendedEventConsumerDependencies>>,
  eventProducers: Record<string, mstsProducer.KafkaProducerConfig>,
  jobServiceConfig: mstsJobService.JobServiceConfig,
  retryDlqConfig: Record<string, messaging.retryDlq.RetryDlqConfig<mstsJobService.QueueConfig, mstsJobService.AddQueueResult, messaging.retryDlq.Dependencies<mstsJobService.QueueConfig, mstsJobService.AddQueueResult>, any>>,
): ExtendedMicroserviceConfig => ({
  database: databaseConfig,
  http: httpConfig, 
  logging: loggingConfig,
  eventConsumers,
  eventProducers,
  jobService: jobServiceConfig,
  retryDlq: retryDlqConfig,
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

  // Construct the database provider
  const databaseProvider = createDatabaseProvider(config.database);

  // Construct the observability service provider
  const observabilityProvider = mstsObservability.createProvider();

  // Construct the job service provider
  const jobServiceProvider = mstsJobService.createJobServiceProvider(config.jobService);

  // Construct the retry dlq service provider
  const retryDlqProvider = mstsRetryDlq.createRetryDlqServiceProvider(config.retryDlq);

  // Construct the microservice
  const onStarted = async (dependencies: ExtendedMicroserviceDependencies): Promise<boolean> => {
    await dependencies.database.initialize();
    return true;
  };
  const onStopped = async (dependencies: ExtendedMicroserviceDependencies): Promise<boolean> => {
    await dependencies.database.shutdown();
    return true;
  };

  return microservice.createMicroservice<mstsJobService.QueueConfig, mstsJobService.AddQueueResult, ExtendedMicroserviceDependencies>(
    { 
      onStarted,
      onStopped,
    },
    {
      database: databaseProvider,
      logger: loggingProvider,
      httpServer: httpProvider,
      eventConsumers: kafkaConsumersProvider,
      eventProducers: kafkaProducersProvider,
      observabilityService: observabilityProvider,
      jobService: jobServiceProvider,
      retryDlqService: retryDlqProvider,
    },
  );
};

const main = async (): Promise<void> => {
  const app = createApp();
  const routes = createRoutes();
  const databaseConfig = createDatabaseConfig();
  const httpConfig = createHttpConfig(routes);
  const loggingConfig = createLoggingConfig();
  const eventConsumers = createEventConsumers();
  const eventProducers = createEventProducers();
  const jobServiceConfig = createJobServiceConfig();
  const retryDlqConfig = createRetryDlqConfig();
  const microserviceConfig = createMicroserviceConfig(
    databaseConfig,
    httpConfig,
    loggingConfig,
    eventConsumers,
    eventProducers,
    jobServiceConfig,
    retryDlqConfig,
  );
  const service = resolveMicroservice(app, microserviceConfig);
  await service.start();
};

main();
