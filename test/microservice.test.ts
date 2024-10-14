import { assert } from 'chai';
import express from 'express';
import request from 'supertest';
import { di, http, logger, microservice as microserviceNS } from '../src';

describe('Microservice', () => {
  let microservice: microserviceNS.Microservice;

  before('creates a microservice', async () => {
    const routes: http.providers.express.ExpressRouteDefinition[] = [
      {
        path: '/200',
        method: http.HttpMethod.GET,
        middleware: [
          (req: express.Request, _res: express.Response, next: express.NextFunction) => {
            (req as any).appliedRouteMiddleware = true;
            next();
          },
        ],
        handler: http.routeHandler.create(
          (_dependencies) => (_context) => async (request) => ({
            ...request,
            parsed: true,
          })
        )(
          (_dependencies) => (_context) => async (request) => ({
            statusCode: 200,
            data: { 
              parsed: request.parsed, 
              message: 'Hello, world!' 
            },
          })
        ),
      },
      {
        path: '/200',
        method: http.HttpMethod.POST,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 200,
            data: { message: 'Hello, world!' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.POST,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.GET,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.POST,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.GET,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
      {
        path: '/200',
        method: http.HttpMethod.PUT,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 200,
            data: { message: 'Hello, world!' },
          };
        },
      },
      {
        path: '/200',
        method: http.HttpMethod.PATCH,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 200,
            data: { message: 'Hello, world!' },
          };
        },
      },
      {
        path: '/200',
        method: http.HttpMethod.DELETE,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 200,
            data: { message: 'Hello, world!' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.PUT,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.PATCH,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.DELETE,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.PUT,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.PATCH,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.DELETE,
        handler: (_dependencies) => (_context) => async (_request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
    ];
    const httpConfig: http.config.HttpConfig = {
      host: 'localhost',
      port: 3000,
      logging: {
        logRequests: {
          get: logger.LogLevel.INFO,
          post: logger.LogLevel.INFO,
          put: logger.LogLevel.INFO,
          delete: logger.LogLevel.INFO,
          patch: logger.LogLevel.INFO,
        },
        logResponses: {
          200: logger.LogLevel.INFO,
          400: logger.LogLevel.WARN,
          500: logger.LogLevel.ERROR,
        },
      },
      routes,
    };
    const loggingConfig: logger.config.LoggingConfig = {
      level: logger.LogLevel.TRACE,
    };
    const config = {
      http: httpConfig,
      logging: loggingConfig,
    };
    const loggerProvider = logger.providers.console.createProvider(config.logging);
    di.register('logger', [], loggerProvider);

    const app = express();
    const extractRequestContext = (req: express.Request): Record<string, unknown> => ({
      appliedRouteMiddleware: (req as any).appliedRouteMiddleware ? true : false,
      extractedRequestContext: true,
    });
    const opts = { extractRequestContext };
    const httpProvider = http.providers.express.server.createProvider(app, config.http, opts);
    di.register('httpServer', ['logger'], httpProvider);

    const provider = microserviceNS.createProvider();
    di.register('microservice', ['httpServer', 'logger'], provider);
    microservice = await di.resolve('microservice', provider);
    await microservice.start();
  });

  after('stops the server', async () => {
    await microservice.stop();
  });

  it('get responds with Hello, world!', async () => {
    const response = await request('localhost:3000').get('/200');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { parsed: true, message: 'Hello, world!' });
  });

  it('get responds with 400', async () => {
    const response = await request('localhost:3000').get('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('get responds with 500', async () => {
    const response = await request('localhost:3000').get('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

  it('post responds with Hello, world!', async () => {
    const response = await request('localhost:3000').post('/200');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Hello, world!' });
  });

  it('post responds with 400', async () => {
    const response = await request('localhost:3000').post('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('post responds with 500', async () => {
    const response = await request('localhost:3000').post('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

  it('put responds with Hello, world!', async () => {
    const response = await request('localhost:3000').put('/200');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Hello, world!' });
  });

  it('put responds with 400', async () => {
    const response = await request('localhost:3000').put('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('put responds with 500', async () => {
    const response = await request('localhost:3000').put('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

  it('patch responds with Hello, world!', async () => {
    const response = await request('localhost:3000').patch('/200');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Hello, world!' });
  });

  it('patch responds with 400', async () => {
    const response = await request('localhost:3000').patch('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('patch responds with 500', async () => {
    const response = await request('localhost:3000').patch('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

  it('delete responds with Hello, world!', async () => {
    const response = await request('localhost:3000').delete('/200');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Hello, world!' });
  });

  it('delete responds with 400', async () => {
    const response = await request('localhost:3000').delete('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('delete responds with 500', async () => {
    const response = await request('localhost:3000').delete('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

});
