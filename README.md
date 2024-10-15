# Microservice-TS

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Microservice-TS is a declarative, functional library enabling agile creation of microservices with dependency injection.

## Features

- **Declarative Configuration**: Define your microservice structure and behavior using a simple, declarative configuration.
- **HTTP Support**: Built-in support for HTTP servers with Express integration.
- **Event Consumers**: Built-in support for Kafka event consumers.
- **Event Producers**: Built-in support for Kafka event producers.
- **Dependency Injection**: A lightweight DI container for managing service dependencies.
- **Logging**: Flexible logging system with configurable log levels.
- **Request/Response Handling**: Streamlined request processing and response generation.
- **Error Handling**: Built-in error handling and conversion to standardized error responses.
- **TypeScript Support**: Fully typed for improved developer experience and code quality.

## Example

```typescript
import express from 'express';
import { di, events, http, logger, microservice } from '..';

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

const routes: http.providers.express.ExpressRouteDefinition[] = [getRoute];

// Define the logging configuration, required for an http microservice
const loggingConfig: logger.config.LoggingConfig = {
  level: logger.LogLevel.INFO,
};

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

// Construct the kafka consumer configuration
const eventConsumers: Record<string, events.consumer.config.EventConsumerConfig> = {
  kafkaConsumer: {
    clientId: 'kafka-consumer',
    brokers: ['localhost:9092'],
    groupId: 'kafka-group',
    subscribeTopics: {
      topics: ['test-topic'],
    },
    runConfig: { 
      eachMessage: async (message) => {
        console.log(message);
      },
    },
  },
};

const eventProducers: Record<string, events.producer.config.EventProducerConfig> = {
  kafkaProducer: {
    config: {
      clientId: 'kafka-producer',
      brokers: ['localhost:9092'],
    },
    producerConfig: {
      allowAutoTopicCreation: true,
    },
  },
};

// Construct the microservice configuration
const config: microservice.MicroserviceConfig = {
  http: httpConfig,
  logging: loggingConfig,
  eventConsumers,
  eventProducers,
};

// Construct the express app
const app = express();

// Apply the application middleware
app.use(appMiddleware);

// Construct a function that extracts request context from the request
const extractRequestContext = (req: express.Request): Record<string, unknown> => ({
  extractedRequestContext: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appliedAppMiddleware: (req as any).appliedAppMiddleware,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appliedRouteMiddleware: (req as any).appliedRouteMiddleware,
});

// Construct and register the logger provider
const loggerProvider = logger.providers.console.createProvider(config.logging);
di.register('logger', [], loggerProvider);

// Construct and register the http server provider
const opts = { extractRequestContext };
const httpProvider = http.providers.express.server.createProvider(app, config.http, opts);
di.register('httpServer', ['logger'], httpProvider);

// Construct and register the kafka consumers provider
const kafkaConsumerConfig = config.eventConsumers.kafkaConsumer;
if (!kafkaConsumerConfig) {
  throw new Error('Kafka consumer config is not defined');
}
const kafkaConsumerProvider = events.consumer.providers.kafka.createProvider(kafkaConsumerConfig);
const kafkaConsumersProvider = events.consumer.providers.kafka.createMultiProvider({
  kafkaConsumer: kafkaConsumerProvider,
});
di.register('eventConsumers', ['logger'], kafkaConsumersProvider);

// Construct and register the kafka producers provider
const kafkaProducerConfig = config.eventProducers.kafkaProducer;
if (!kafkaProducerConfig) {
  throw new Error('Kafka producer config is not defined');
}
const kafkaProducerProvider = events.producer.providers.kafka.createProvider(kafkaProducerConfig);
const kafkaProducersProvider = events.producer.providers.kafka.createMultiProvider({
  kafkaProducer: kafkaProducerProvider,
});
di.register('eventProducers', ['logger'], kafkaProducersProvider);

// Construct and register the microservice provider
const microserviceProvider = microservice.createProvider();
di.register('microservice', ['httpServer', 'logger', 'eventConsumers', 'eventProducers'], microserviceProvider);

const main = async (): Promise<void> => {
  // Resolve and start the microservice
  const service = await di.resolve('microservice', microserviceProvider);
  await service.start();

  // We did it!
  console.log('Microservice is running on http://localhost:3000');
};

main();
```
