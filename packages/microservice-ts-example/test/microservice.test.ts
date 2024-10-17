import { di, http, logging, microservice as microserviceNS } from '@jrball3/microservice-ts';
import * as mstsExpress from '@jrball3/microservice-ts-http-express';
import * as mstsLogging from '@jrball3/microservice-ts-logging-console';
import * as mstsConsumer from '@jrball3/microservice-ts-messaging-kafka-consumer';
import * as mstsProducer from '@jrball3/microservice-ts-messaging-kafka-producer';
import * as mstsObservability from '@jrball3/microservice-ts-observability-service';
import { asFunction, createContainer } from 'awilix';
import express from 'express';
import { Consumer, Kafka, Producer } from 'kafkajs';
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

type ExtendedMicroserviceDependencies = microserviceNS.Dependencies & ExtendedDependencies;

type ExtendedHttpDependencies = http.Dependencies & ExtendedDependencies;

describe('Microservice', () => {
  let microservice: microserviceNS.Microservice;

  const mockConsumer = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  };

  const mockProducer = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(() => {
    jest.spyOn(Kafka.prototype, 'consumer').mockReturnValue(mockConsumer as unknown as Consumer);
    jest.spyOn(Kafka.prototype, 'producer').mockReturnValue(mockProducer as unknown as Producer);
  });

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
    const config = {
      http: httpConfig,
      logging: loggingConfig,
      database: databaseConfig,
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

    const kafkaConfig: mstsConsumer.KafkaConsumerConfig = {
      clientId: 'my-app',
      brokers: ['localhost:9092'],
      groupId: 'my-group',
      subscribeTopics: { topics: ['my-topic'] },
      runConfig: {
        eachMessage: sinon.stub().resolves(true),
      },
    };
    const kafkaConsumerProvider = mstsConsumer.createProvider(kafkaConfig);
    const kafkaConsumersProvider = mstsConsumer.createMultiProvider({
      kafkaConsumer: kafkaConsumerProvider,
    });

    const kafkaProducerConfig: mstsProducer.KafkaProducerConfig = {
      config: {
        clientId: 'my-app',
        brokers: ['localhost:9092'],
      },
      producerConfig: {},
    };
    const kafkaProducerProvider = mstsProducer.createProvider(kafkaProducerConfig);
    const kafkaProducersProvider = mstsProducer.createMultiProvider({
      kafkaProducer: kafkaProducerProvider,
    });
    const databaseProvider = createDatabaseProvider(config.database);
    const observabilityProvider = mstsObservability.createProvider();
    const microserviceProvider = microserviceNS.createProvider(
      () => Promise.resolve(true),
      () => Promise.resolve(true),
    );
    const container = createContainer<ExtendedMicroserviceDependencies & { microservice: microserviceNS.Microservice }>();
    container.register({
      logger: asFunction(loggingProvider).singleton(),
      httpServer: asFunction(httpProvider).singleton(),
      eventConsumers: asFunction(kafkaConsumersProvider).singleton(),
      eventProducers: asFunction(kafkaProducersProvider).singleton(),
      microservice: asFunction(microserviceProvider).singleton(),
      observabilityService: asFunction(observabilityProvider).singleton(),
      database: asFunction(databaseProvider).singleton(),
    });
    microservice = container.resolve<microserviceNS.Microservice>('microservice');
    await microservice.start();
  });

  afterAll(async () => {
    await microservice.stop();
    expect(mockConsumer.stop).toHaveBeenCalledTimes(1);
    expect(mockConsumer.disconnect).toHaveBeenCalledTimes(1);
    expect(mockProducer.disconnect).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  it('connects and subscribes to Kafka topic', async () => {
    expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
    expect(mockConsumer.subscribe).toHaveBeenCalledTimes(1);
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
