import { di, http, logging, messaging, microservice as microserviceNS } from '@jrball3/microservice-ts';
import * as mstsExpress from '@jrball3/microservice-ts-http-express';
import * as mstsLogging from '@jrball3/microservice-ts-logging-console';
import * as mstsConsumer from '@jrball3/microservice-ts-messaging-kafka-consumer';
import * as mstsProducer from '@jrball3/microservice-ts-messaging-kafka-producer';
import * as mstsRetryDlq from '@jrball3/microservice-ts-messaging-retry-dlq-redis';
import * as mstsObservability from '@jrball3/microservice-ts-observability-service';
import express from 'express';
import { EachMessagePayload } from 'kafkajs';
import sinon from 'sinon';
import supertest from 'supertest';

type User = {
  id: string;
  name: string;
};

type Database = {
  findUser: (id: string) => Promise<User | undefined>;
};

type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

const createDatabaseProvider = (_config: DatabaseConfig): di.Provider<unknown, Database> => (): Database => ({
  findUser: async (id: string): Promise<User | undefined> => ({
    id,
    name: 'John Doe',
  }),
});

type ExtendedDependencies = {
  database: Database;
};

type ExtendedMicroserviceDependencies = microserviceNS.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult> & ExtendedDependencies;

type ExtendedHttpDependencies = http.Dependencies & ExtendedDependencies;

describe('Microservice', () => {
  let microservice: microserviceNS.Microservice;
  let kafkaConsumer: messaging.consumer.EventConsumer;
  let consumerHandlerStub = sinon.stub().resolves();
  let consumerHandler: mstsConsumer.WrappedEachMessageHandler<messaging.consumer.Dependencies> = (
    dependencies: messaging.consumer.Dependencies,
  ) => async (payload): Promise<void> => {
    consumerHandlerStub(dependencies, payload);
  };
  let kafkaProducer: messaging.producer.EventProducer;

  beforeAll(async () => {
    const routes: mstsExpress.ExpressRouteDefinition<ExtendedHttpDependencies>[] = [
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
          (dependencies) => async (_context, request) => ({
            statusCode: 200,
            data: {
              parsed: request.parsed,
              message: 'Hello, world!',
              user: await dependencies.database.findUser('123'),
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
    const httpConfig: http.config.HttpConfig<ExtendedHttpDependencies> = {
      host: 'localhost',
      port: 3000,
      logging: {
        logRequests: {
          get: logging.LogLevel.INFO,
          post: logging.LogLevel.INFO,
          put: logging.LogLevel.INFO,
          delete: logging.LogLevel.INFO,
          patch: logging.LogLevel.INFO,
        },
        logResponses: {
          200: logging.LogLevel.INFO,
          400: logging.LogLevel.WARN,
          500: logging.LogLevel.ERROR,
        },
      },
      routes,
    };
    const loggingConfig: logging.config.LoggingConfig = {
      level: logging.LogLevel.INFO,
    };
    const databaseConfig: DatabaseConfig = {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
    };
    const config: microserviceNS.MicroserviceConfig<
      ExtendedHttpDependencies,
      mstsConsumer.KafkaConsumerConfig,
      mstsProducer.KafkaProducerConfig,
      mstsRetryDlq.JobServiceConfig,
      messaging.retryDlq.RetryDlqConfig<
        mstsRetryDlq.QueueConfig,
        mstsRetryDlq.AddQueueResult,
        messaging.retryDlq.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>,
        any
      >
    > & {
      database: DatabaseConfig;
    } = {
      http: httpConfig,
      logging: loggingConfig,
      eventConsumers: {
        exampleConsumer: {
          kafka: {
            clientId: 'my-app',
            brokers: ['localhost:29092'],
          },
          consumer: {
            groupId: 'my-group',
            subscribeTopics: { topics: ['my-topic'] },
            runConfig: {
              eachMessage: consumerHandler,
            },
          },
        },
      },
      eventProducers: {
        exampleProducer: {
          kafka: {
            clientId: 'my-app',
            brokers: ['localhost:29092'],
          },
          producer: {},
        },
      },
      database: databaseConfig,
      jobService: {
        redis: {
          host: 'localhost',
          port: 6379,
          maxRetriesPerRequest: null, // required for bullmq
        },
      },
      retryDlq: {
        exampleConsumer: {
          identifier: {
            topic: 'my-topic',
            consumerGroup: 'my-group',
          },
          attempts: 3,
          handler: sinon.stub().resolves(true),
        },
        exampleProducer: {
          identifier: {
            producer: 'my-producer',
          },
          attempts: 3,
          handler: sinon.stub().resolves(true),
        },
      },
    };
    const loggingProvider = mstsLogging.createProvider(config.logging);

    const app = express();
    const extractRequestContext = (req: express.Request): Record<string, unknown> => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appliedRouteMiddleware: (req as any).appliedRouteMiddleware ? true : false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extractedRequestContext: (req as any).extractedRequestContext ? true : false,
    });
    const opts = { extractRequestContext };
    const httpProvider = mstsExpress.server.createProvider(app, config.http, opts);

    const kafkaConsumerProvider = mstsConsumer.createProvider(config.eventConsumers.exampleConsumer);
    const kafkaConsumersProvider = mstsConsumer.createMultiProvider({
      exampleConsumer: kafkaConsumerProvider,
    });
    const kafkaProducerProvider = mstsProducer.createProvider(config.eventProducers.exampleProducer);
    const kafkaProducersProvider = mstsProducer.createMultiProvider({
      exampleProducer: kafkaProducerProvider,
    });
    const databaseProvider = createDatabaseProvider(config.database);
    const observabilityProvider = mstsObservability.createProvider();
    const jobServiceProvider = mstsRetryDlq.createJobServiceProvider(config.jobService);
    const retryDlqProvider = mstsRetryDlq.createRetryDlqServiceProvider(config.retryDlq);

    const onStarted = (deps: microserviceNS.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>): Promise<boolean> => {
      kafkaConsumer = deps.eventConsumers!.exampleConsumer
      kafkaProducer = deps.eventProducers!.exampleProducer;
      return Promise.resolve(true);
    }
    const onStopped = (_dependencies: microserviceNS.Dependencies<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult>): Promise<boolean> => Promise.resolve(true);
    microservice = microserviceNS.createMicroservice<mstsRetryDlq.QueueConfig, mstsRetryDlq.AddQueueResult, ExtendedMicroserviceDependencies>(
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
    await microservice.start();
  });

  afterAll(async () => {
    await microservice.stop();
  });

  it('connects and subscribes to Kafka topic', async () => {
    expect(kafkaConsumer.isConnected()).toBe(true);
    expect(kafkaConsumer.isRunning()).toBe(true);
  });

  it('sends and receives messages to/from Kafka topic', async () => {
    const result = await kafkaProducer.send(
      'my-topic',
      JSON.stringify({ message: 'Hello, world!' }),
    );
    expect(result.success).toBe(true);
    // wait a second for the message to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(consumerHandlerStub.called).toBe(true);
    const call = consumerHandlerStub.getCall(0);
    const dependencies = call.args[0] as messaging.consumer.Dependencies;
    expect(dependencies.retryDlqService).toBeDefined();
    expect(dependencies.observabilityService).toBeDefined();
    const payload = call.args[1] as EachMessagePayload;
    expect(payload.message.value).toEqual(Buffer.from(JSON.stringify({ message: 'Hello, world!' })));
  });

  it('connects and prepares to produce to Kafka topic', async () => {
    expect(kafkaProducer.isConnected()).toBe(true);
    expect(kafkaProducer.isRunning()).toBe(true);
  });

  it('get responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').get('/200');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ parsed: true, message: 'Hello, world!', user: { id: '123', name: 'John Doe' } });
  });

  it('get responds with 400', async () => {
    const response = await supertest('localhost:3000').get('/400');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Bad request' });
  });

  it('get responds with 500', async () => {
    const response = await supertest('localhost:3000').get('/500');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });

  it('post responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').post('/200');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Hello, world!' });
  });

  it('post responds with 400', async () => {
    const response = await supertest('localhost:3000').post('/400');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Bad request' });
  });

  it('post responds with 500', async () => {
    const response = await supertest('localhost:3000').post('/500');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });

  it('put responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').put('/200');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Hello, world!' });
  });

  it('put responds with 400', async () => {
    const response = await supertest('localhost:3000').put('/400');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Bad request' });
  });

  it('put responds with 500', async () => {
    const response = await supertest('localhost:3000').put('/500');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });

  it('patch responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').patch('/200');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Hello, world!' });
  });

  it('patch responds with 400', async () => {
    const response = await supertest('localhost:3000').patch('/400');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Bad request' });
  });

  it('patch responds with 500', async () => {
    const response = await supertest('localhost:3000').patch('/500');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });

  it('delete responds with Hello, world!', async () => {
    const response = await supertest('localhost:3000').delete('/200');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Hello, world!' });
  });

  it('delete responds with 400', async () => {
    const response = await supertest('localhost:3000').delete('/400');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Bad request' });
  });

  it('delete responds with 500', async () => {
    const response = await supertest('localhost:3000').delete('/500');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });
});
