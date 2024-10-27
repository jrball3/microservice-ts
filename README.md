# Microservice-TS

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Microservice-TS is a declarative, functional library enabling agile creation of microservices with dependency injection.

## Features

- **Declarative Configuration**: Define your microservice structure and behavior using a simple, declarative configuration.
- **HTTP Support**: Built-in support for HTTP servers with Express integration.
- **Event Consumers**: Built-in support for Kafka event consumers.
- **Event Producers**: Built-in support for Kafka event producers.
- **Job Service**: Built-in support for job queuing and retry for message consumers and producers.
- **Retry / Dead Letter Queue**: Built-in support for retry and dead letter queueing for Kafka consumers and producers.
- **Observability**: Built-in support for observability for integration with observability tools like OpenTelemetry.
- **Dependency Injection**: Composed to integrate well with dependency injection solutions like Awilix. 
- **Extensible Dependencies**: Inject additional dependencies into your microservice.
- **Logging**: Flexible logging system with configurable log levels.
- **Request/Response Handling**: Streamlined request processing and response generation.
- **Error Handling**: Built-in error handling and conversion to standardized error responses.
- **TypeScript Support**: Fully typed for improved developer experience and code quality.

## Example

```typescript
import { http, logging, messaging, microservice, observability } from '@jrball3/microservice-ts';
import * as mstsExpress from '@jrball3/microservice-ts-http-express';
import * as mstsLogging from '@jrball3/microservice-ts-logging-console';
import * as mstsConsumer from '@jrball3/microservice-ts-messaging-kafka-consumer';
import * as mstsProducer from '@jrball3/microservice-ts-messaging-kafka-producer';
import * as mstsRetryDlq from '@jrball3/microservice-ts-messaging-retry-dlq-redis';
import * as mstsObservability from '@jrball3/microservice-ts-observability-service';
import express from 'express';

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
        eachMessage: (dependencies: messaging.consumer.Dependencies) => 
        async (message: unknown) => {
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
  exampleProducer: {
    kafka: {
      clientId: 'kafka-producer',
      brokers: ['localhost:9092'],
    },
    producer: {
      allowAutoTopicCreation: true,
    },
  },
});

const createJobServiceConfig = (): mstsRetryDlq.JobServiceConfig => ({
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

const createRetryDlqConfig = (): Record<string, messaging.retryDlq.RetryDlqConfig<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult, messaging.retryDlq.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>, any>> => ({
  exampleConsumerDlq: {
    identifier: {
      topic: 'test-retry-dlq',
      consumerGroup: 'test-consumer-group',
    },
    attempts: 3,
    handler: (dependencies: messaging.retryDlq.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>) =>
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
    handler: (dependencies: messaging.retryDlq.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>) =>
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
  httpConfig: http.config.HttpConfig,
  loggingConfig: logging.config.LoggingConfig,
  eventConsumers: Record<string, mstsConsumer.KafkaConsumerConfig>,
  eventProducers: Record<string, mstsProducer.KafkaProducerConfig>,
  jobServiceConfig: mstsRetryDlq.JobServiceConfig,
  retryDlqConfig: Record<string, messaging.retryDlq.RetryDlqConfig<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult, messaging.retryDlq.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>, any>>,
): microservice.MicroserviceConfig<
  http.Dependencies,
  mstsConsumer.KafkaConsumerConfig,
  mstsProducer.KafkaProducerConfig,
  mstsRetryDlq.JobServiceConfig,
  messaging.retryDlq.RetryDlqConfig<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult, messaging.retryDlq.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>, any>
> => ({
  http: httpConfig,
  logging: loggingConfig,
  eventConsumers,
  eventProducers,
  jobService: jobServiceConfig,
  retryDlq: retryDlqConfig,
});

export const resolveMicroservice = (
  app: express.Application,
  config: microservice.MicroserviceConfig<
    http.Dependencies,
    mstsConsumer.KafkaConsumerConfig,
    mstsProducer.KafkaProducerConfig,
    mstsRetryDlq.JobServiceConfig,
    messaging.retryDlq.RetryDlqConfig<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult, messaging.retryDlq.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>, any>
  >,
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
  const kafkaConsumerConfig = config.eventConsumers.exampleConsumer;
  if (!kafkaConsumerConfig) {
    throw new Error('Kafka consumer config is not defined');
  }
  const kafkaConsumerProvider = mstsConsumer.createProvider(kafkaConsumerConfig);
  const kafkaConsumersProvider = mstsConsumer.createMultiProvider({
    exampleConsumer: kafkaConsumerProvider,
  });

  // Construct the kafka producers provider
  const kafkaProducerConfig = config.eventProducers.exampleProducer;
  if (!kafkaProducerConfig) {
    throw new Error('Kafka producer config is not defined');
  }
  const kafkaProducerProvider = mstsProducer.createProvider(kafkaProducerConfig);
  const kafkaProducersProvider = mstsProducer.createMultiProvider({
    exampleProducer: kafkaProducerProvider,
  });

  // Construct the observability service provider
  const observabilityProvider = mstsObservability.createProvider();

  // Construct the job service
  const jobServiceProvider = mstsRetryDlq.createJobServiceProvider(config.jobService);

  // Construct the retry dlq service
  const retryDlqProvider = mstsRetryDlq.createRetryDlqServiceProvider(config.retryDlq);

  // Construct the microservice
  const onStarted = (_dependencies: microservice.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>): Promise<boolean> => Promise.resolve(true);
  const onStopped = (_dependencies: microservice.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>): Promise<boolean> => Promise.resolve(true);

  return microservice.createMicroservice<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult, microservice.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>>(
    {
      onStarted,
      onStopped,
    },
    {
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
  const httpConfig = createHttpConfig(routes);
  const loggingConfig = createLoggingConfig();
  const eventConsumers = createEventConsumers();
  const eventProducers = createEventProducers();
  const jobServiceConfig = createJobServiceConfig();
  const retryDlqConfig = createRetryDlqConfig();
  const microserviceConfig = createMicroserviceConfig(
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
```
