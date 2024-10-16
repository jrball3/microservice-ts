# Microservice-TS

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Microservice-TS is a declarative, functional library enabling agile creation of microservices with dependency injection.

## Features

- **Declarative Configuration**: Define your microservice structure and behavior using a simple, declarative configuration.
- **HTTP Support**: Built-in support for HTTP servers with Express integration.
- **Event Consumers**: Built-in support for Kafka event consumers.
- **Event Producers**: Built-in support for Kafka event producers.
- **Dependency Injection**: Composed to integrate well with dependency injection solutions like Awilix. 
- **Logging**: Flexible logging system with configurable log levels.
- **Request/Response Handling**: Streamlined request processing and response generation.
- **Error Handling**: Built-in error handling and conversion to standardized error responses.
- **TypeScript Support**: Fully typed for improved developer experience and code quality.

## Example

```typescript
import express from 'express';
import { createContainer, asFunction } from 'awilix';
import { http, logger, microservice, messaging } from '..';


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
}


const createRoutes = (): http.providers.express.ExpressRouteDefinition[] => {
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
  const getRoute: http.providers.express.ExpressRouteDefinition = {
    path: '/',
    method: http.HttpMethod.GET,
    middleware: [getMiddleware],
    handler: getHandler,
  };

  return [getRoute];
}

const createHttpConfig = (routes: http.providers.express.ExpressRouteDefinition[]): http.config.HttpConfig => {
  // Construct the HTTP server configuration
  const httpConfig: http.config.HttpConfig = {
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
}

const createLoggingConfig = (): logger.config.LoggingConfig => {
  // Define the logging configuration, required for an http microservice
  const loggingConfig: logger.config.LoggingConfig = {
    level: logger.LogLevel.INFO,
  };

  return loggingConfig;
}

const createEventConsumers = (): Record<string, messaging.consumer.config.EventConsumerConfig> => ({
  kafkaConsumer: {
    clientId: 'kafka-consumer',
    brokers: ['localhost:9092'],
    groupId: 'kafka-group',
    subscribeTopics: {
      topics: ['test-topic'],
    },
    runConfig: {
      eachMessage: (_dependencies: messaging.consumer.EventConsumerDependencies) => 
        async (message) => {
          console.log(message);
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
  http: http.config.HttpConfig,
  logging: logger.config.LoggingConfig,
  eventConsumers: Record<string, messaging.consumer.config.EventConsumerConfig>,
  eventProducers: Record<string, messaging.producer.config.EventProducerConfig>,
): microservice.MicroserviceConfig => {
  // Construct the microservice configuration
  const config: microservice.MicroserviceConfig = {
    http,
    logging,
    eventConsumers,
    eventProducers,
  };
  return config;
};


export const resolveMicroservice = (
  app: express.Application,
  config: microservice.MicroserviceConfig
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

  // Construct the microservice provider
  const microserviceProvider = microservice.createProvider();
  const container = createContainer<microservice.Dependencies & { microservice: microservice.Microservice }>();
  
  // Register providers
  container.register({
    logger: asFunction(loggerProvider).singleton(),
    httpServer: asFunction(httpProvider).singleton(),
    eventConsumers: asFunction(kafkaConsumersProvider).singleton(),
    eventProducers: asFunction(kafkaProducersProvider).singleton(),
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
```
