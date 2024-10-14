# Microservice-TS

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Microservice-TS is a declarative, functional library enabling agile creation of microservices with dependency injection.

## Features

- **Declarative Configuration**: Define your microservice structure and behavior using a simple, declarative configuration.
- **HTTP Support**: Built-in support for HTTP servers with Express integration.
- **Dependency Injection**: A lightweight DI container for managing service dependencies.
- **Logging**: Flexible logging system with configurable log levels.
- **Request/Response Handling**: Streamlined request processing and response generation.
- **Error Handling**: Built-in error handling and conversion to standardized error responses.
- **TypeScript Support**: Fully typed for improved developer experience and code quality.

## Example

```typescript
import express from 'express';
import { di, http, logger, microservice } from 'microservice-ts';

// Define the logging configuration, required for an http microservice
const loggingConfig: logger.config.LoggingConfig = {
  level: logger.LogLevel.INFO,
};

// Construct some application middleware
const appMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  (req as any).appliedAppMiddleware = true;
  next();
};

// Construct some native express middleware for one route
const getMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  (req as any).appliedRouteMiddleware = true;
  next();
};

// Construct a route handler for a GET route
const getHandler = (_dependencies: http.Dependencies) => 
  (_context: http.RequestContext) =>
  async (_request: http.UnparsedRequest) => {
    return {
      code: 200,
      data: { message: 'Hello, world!' },
    };
  };

// Construct a route for a GET route
const getRoute: http.providers.express.config.ExpressRouteConfig = {
  path: '/',
  method: HttpMethod.GET,
  middleware: [getMiddleware],
  handler: getHandler,
};

const routes: http.providers.express.config.ExpressRouteConfig[] = [getRoute];

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

// Construct the microservice configuration
const config: microservice.MicroserviceConfig = {
  http: httpConfig,
  logging: loggingConfig,
};

// Set up the dependency injection container
const loggerProvider = logger.providers.console.createProvider(config.logging);
di.register('logger', [], loggerProvider);

// Construct the express app
const app = express();

// Apply the application middleware
app.use(appMiddleware);

// Construct a function that extracts request context from the request
const extractRequestContext = (req: express.Request) => ({ 
  extractedRequestContext: true,
  appliedAppMiddleware: (req as any).appliedAppMiddleware,
  appliedRouteMiddleware: (req as any).appliedRouteMiddleware,
});

// Construct the http server provider
const opts = { extractRequestContext };
const httpProvider = http.providers.express.server.createProvider(app, config.http, opts);
di.register('httpServer', ['logger'], httpProvider);

// Construct the microservice provider
const microserviceProvider = microservice.createProvider();
di.register('microservice', ['httpServer', 'logger'], microserviceProvider);

// Resolve and start the microservice
const service = await di.resolve('microservice', microserviceProvider);
await service.start();

// We did it!
console.log('Microservice is running on http://localhost:3000');
```
