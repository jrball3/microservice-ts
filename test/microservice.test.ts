import { assert } from 'chai';
import express from 'express';
import request from 'supertest';
import { di, http, logger, microservice as microserviceNS } from '../src';
describe('Microservice', () => {
  let microservice: microserviceNS.Microservice;

  before('creates a microservice', async () => {
    const config: microserviceNS.MicroserviceConfig = {
      http: {
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
        routes: [
          {
            path: '/200',
            method: 'post',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 200,
                data: { message: 'Hello, world!' },
              };
            },
          },
          {
            path: '/200',
            method: 'get',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 200,
                data: { message: 'Hello, world!' },
              };
            },
          },
          {
            path: '/400',
            method: 'post',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 400,
                data: { message: 'Bad request' },
              };
            },
          },
          {
            path: '/400',
            method: 'get',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 400,
                data: { message: 'Bad request' },
              };
            },
          },
          {
            path: '/500',
            method: 'post',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 500,
                data: { message: 'Internal server error' },
              };
            },
          },
          {
            path: '/500',
            method: 'get',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 500,
                data: { message: 'Internal server error' },
              };
            },
          },
          {
            path: '/200',
            method: 'put',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 200,
                data: { message: 'Hello, world!' },
              };
            },
          },
          {
            path: '/200',
            method: 'patch',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 200,
                data: { message: 'Hello, world!' },
              };
            },
          },
          {
            path: '/200',
            method: 'delete',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 200,
                data: { message: 'Hello, world!' },
              };
            },
          },
          {
            path: '/400',
            method: 'put',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 400,
                data: { message: 'Bad request' },
              };
            },
          },
          {
            path: '/400',
            method: 'patch',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 400,
                data: { message: 'Bad request' },
              };
            },
          },
          {
            path: '/400',
            method: 'delete',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 400,
                data: { message: 'Bad request' },
              };
            },
          },
          {
            path: '/500',
            method: 'put',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 500,
                data: { message: 'Internal server error' },
              };
            },
          },
          {
            path: '/500',
            method: 'patch',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 500,
                data: { message: 'Internal server error' },
              };
            },
          },
          {
            path: '/500',
            method: 'delete',
            handler: (_dependencies) => (_context) => async (_request) => {
              return {
                code: 500,
                data: { message: 'Internal server error' },
              };
            },
          },
        ],
      },
      logging: {
        level: logger.LogLevel.TRACE,
      },
    };

    const loggerProvider = logger.providers.console.createProvider(config.logging);
    di.register('logger', [], loggerProvider);

    const app = express();
    const extractRequestContext = (_req: express.Request): Record<string, unknown> => ({
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
    assert.deepEqual(response.body, { message: 'Hello, world!' });
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
