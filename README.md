# Microservice-TS

Microservice-TS is a declarative library enabling agile creation of microservices in TypeScript, using dependency injection, built on functional programming principles.

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
import { di, http, logger, microservice } from 'microservice-ts';

// Define the microservice configuration
const config: microservice.MicroserviceConfig = {
  http: {
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
    routes: [
      {
        path: '/hello',
        method: 'get',
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            code: 200,
            data: { message: 'Hello, World!' },
          };
        },
      },
      {
        path: '/echo',
        method: 'post',
        handler: (_dependencies) => (_context) => async (request) => {
          return {
            code: 200,
            data: { echo: request.body },
          };
        },
      },
    ],
  },
  logging: {
    level: logger.LogLevel.INFO,
  },
};

// Set up the dependency injection container
const loggerProvider = logger.providers.console.createProvider(config.logging);
di.register('logger', [], loggerProvider);

const app = express();
const httpProvider = http.providers.express.server.createProvider(app, config.http);
di.register('httpServer', ['logger'], httpProvider);

const microserviceProvider = microservice.createProvider();
di.register('microservice', ['httpServer', 'logger'], microserviceProvider);

// Resolve and start the microservice
const service = await di.resolve('microservice', microserviceProvider);
await service.start();
console.log('Microservice is running on http://localhost:3000');
```