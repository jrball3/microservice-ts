/* eslint-disable import/no-named-as-default-member */

import { assert } from 'chai';
import express from 'express';
import supertest from 'supertest';
import sinon from 'sinon';
import { di, events, http, logger, microservice as microserviceNS } from '../src';
import { Kafka, Consumer, Producer } from 'kafkajs';

describe('Microservice', () => {
  let microservice: microserviceNS.Microservice;

  const mockConsumer = {
    connect: sinon.stub().resolves(),
    disconnect: sinon.stub().resolves(),
    subscribe: sinon.stub().resolves(),
    run: sinon.stub().resolves(),
    stop: sinon.stub().resolves(),
  };

  const mockProducer = {
    connect: sinon.stub().resolves(),
    disconnect: sinon.stub().resolves(),
    send: sinon.stub().resolves(),
  };

  before('creates a microservice', async () => {
    
    const routes: http.providers.express.ExpressRouteDefinition[] = [
      {
        path: '/200',
        method: http.HttpMethod.GET,
        middleware: [
          (
            req: express.Request,
            _res: express.Response,
            next: express.NextFunction,
          ): void => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any).appliedRouteMiddleware = true;
            next();
          },
        ],
        handler: http.routeHandler.create(
          (_dependencies) => (_context, request) => ({
            ...request,
            parsed: true,
          }),
          (_dependencies) => async (_context, request) => ({
            statusCode: 200,
            data: { 
              parsed: request.parsed, 
              message: 'Hello, world!', 
            },
          }),
        ),
      },
      {
        path: '/200',
        method: http.HttpMethod.POST,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 200,
            data: { message: 'Hello, world!' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.POST,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.GET,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.POST,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.GET,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
      {
        path: '/200',
        method: http.HttpMethod.PUT,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 200,
            data: { message: 'Hello, world!' },
          };
        },
      },
      {
        path: '/200',
        method: http.HttpMethod.PATCH,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 200,
            data: { message: 'Hello, world!' },
          };
        },
      },
      {
        path: '/200',
        method: http.HttpMethod.DELETE,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 200,
            data: { message: 'Hello, world!' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.PUT,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.PATCH,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/400',
        method: http.HttpMethod.DELETE,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 400,
            data: { message: 'Bad request' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.PUT,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.PATCH,
        handler: (_dependencies) => async (_context, _request) => {
          return {
            statusCode: 500,
            data: { message: 'Internal server error' },
          };
        },
      },
      {
        path: '/500',
        method: http.HttpMethod.DELETE,
        handler: (_dependencies) => async (_context, _request) => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appliedRouteMiddleware: (req as any).appliedRouteMiddleware ? true : false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extractedRequestContext: (req as any).extractedRequestContext ? true : false,
    });
    const opts = { extractRequestContext };
    const httpProvider = http.providers.express.server.createProvider(app, config.http, opts);
    di.register('httpServer', ['logger'], httpProvider);

    sinon.stub(Kafka.prototype, 'consumer').returns(mockConsumer as unknown as Consumer);
    const kafkaConfig: events.consumer.providers.kafka.KafkaConsumerConfig = {
      clientId: 'my-app',
      brokers: ['localhost:9092'],
      groupId: 'my-group',
      subscribeTopics: { topics: ['my-topic'] },
      runConfig: {
        eachMessage: sinon.stub().resolves(true),
      },
    };
    const kafkaConsumerProvider = events.consumer.providers.kafka.createProvider(kafkaConfig);
    const kafkaConsumersProvider = events.consumer.providers.kafka.createMultiProvider({
      kafkaConsumer: kafkaConsumerProvider,
    });
    di.register('eventConsumers', ['logger'], kafkaConsumersProvider);

    sinon.stub(Kafka.prototype, 'producer').returns(mockProducer as unknown as Producer);
    const kafkaProducerConfig: events.producer.config.EventProducerConfig = {
      config: {
        clientId: 'my-app',
        brokers: ['localhost:9092'],
      },
      producerConfig: {},
    };
    const kafkaProducerProvider = events.producer.providers.kafka.createProvider(kafkaProducerConfig);
    const kafkaProducersProvider = events.producer.providers.kafka.createMultiProvider({
      kafkaProducer: kafkaProducerProvider,
    });
    di.register('eventProducers', ['logger'], kafkaProducersProvider);
    
    const microserviceProvider = microserviceNS.createProvider();
    di.register('microservice', ['httpServer', 'logger', 'eventConsumers', 'eventProducers'], microserviceProvider);
    microservice = await di.resolve('microservice', microserviceProvider);
    await microservice.start();
  });

  after('stops the server', async () => {
    await microservice.stop();
    assert.isTrue(mockConsumer.stop.calledOnce);
    assert.isTrue(mockConsumer.disconnect.calledOnce);
    assert.isTrue(mockProducer.disconnect.calledOnce);
    sinon.restore();
  });

  it('connects and subscribes to Kafka topic', async () => {
    assert.isTrue(mockConsumer.connect.calledOnce);
    assert.isTrue(mockConsumer.subscribe.calledOnce);
  });

  it('get responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').get('/200');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { parsed: true, message: 'Hello, world!' });
  });

  it('get responds with 400', async () => {
    const response = await supertest('localhost:3000').get('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('get responds with 500', async () => {
    const response = await supertest('localhost:3000').get('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

  it('post responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').post('/200');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Hello, world!' });
  });

  it('post responds with 400', async () => {
    const response = await supertest('localhost:3000').post('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('post responds with 500', async () => {
    const response = await supertest('localhost:3000').post('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

  it('put responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').put('/200');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Hello, world!' });
  });

  it('put responds with 400', async () => {
    const response = await supertest('localhost:3000').put('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('put responds with 500', async () => {
    const response = await supertest('localhost:3000').put('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

  it('patch responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').patch('/200');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Hello, world!' });
  });

  it('patch responds with 400', async () => {
    const response = await supertest('localhost:3000').patch('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('patch responds with 500', async () => {
    const response = await supertest('localhost:3000').patch('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

  it('delete responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').delete('/200');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { message: 'Hello, world!' });
  });

  it('delete responds with 400', async () => {
    const response = await supertest('localhost:3000').delete('/400');
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message: 'Bad request' });
  });

  it('delete responds with 500', async () => {
    const response = await supertest('localhost:3000').delete('/500');
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  });

});

/* eslint-enable import/no-named-as-default-member */
