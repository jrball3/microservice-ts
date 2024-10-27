import { di, jobs, observability } from '@jrball3/microservice-ts';
import { Job, Queue, QueueOptions, RedisOptions, Worker, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

export type Dependencies = {
  observabilityService: observability.ObservabilityService;
}

const emitWorkerReady = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.worker.ready',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:worker`,
        eventData: {
          queueName,
          workerId: worker.id,
          message: `Worker ${worker.id} for queue '${queueName}' is ready to process jobs`,
        },
      })
    );
  };

const emitWorkerFailed = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker, err: Error): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.worker.failed',
        eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
        eventScope: `job-service:worker`,
        eventData: {
          queueName,
          workerId: worker.id,
          message: `Worker ${worker.id} for queue '${queueName}' has failed with error '${err.message}'`,
          error: err,
        },
      })
    );
  };

const emitWorkerCompleted = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker, job: Job): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.job.completed',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:job`,
        eventData: {
          queueName,
          workerId: worker.id,
          jobId: job.id,
          message: `Job ${job.id} in queue '${queueName}' has been completed`,
        },
      })
    );
  };

const emitJobFailed = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker, job: Job, err: Error): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.job.failed',
        eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
        eventScope: `job-service:job`,
        eventData: {
          queueName,
          workerId: worker.name,
          jobId: job.id,
          message: `Job ${job.id} in queue '${queueName}' has failed with error '${err.message}'`,
          error: err,
        },
      })
    );
  };

const emitWorkerPaused = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.worker.paused',
        eventSeverity: observability.eventSeverity.EventSeverity.WARN,
        eventScope: `job-service:worker`,
        eventData: {
          queueName,
          workerId: worker.id,
          message: `Worker ${worker.id} for queue '${queueName}' has been paused`,
        },
      })
    );
  };

const emitWorkerResumed = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.worker.resumed',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:worker`,
        eventData: {
          queueName,
          workerId: worker.id,
          message: `Worker ${worker.id} for queue '${queueName}' has been resumed`,
        },
      })
    );
  };

const emitWorkerStalled = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker, jobId: string): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.worker.stalled',
        eventSeverity: observability.eventSeverity.EventSeverity.WARN,
        eventScope: `job-service:worker`,
        eventData: {
          queueName,
          workerId: worker.id,
          jobId,
          message: `Job ${jobId} in queue '${queueName}' has been stalled`,
        },
      })
    );
  };

const emitWorkerStarted = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker, job: Job): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.worker.started',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:worker`,
        eventData: {
          queueName,
          workerId: worker.id,
          jobId: job.id,
          message: `Job ${job.id} in queue '${queueName}' has been started`,
        },
      })
    );
  };

const emitWorkerError = <D extends Dependencies>(dependencies: D) =>
  (worker: Worker, err: Error): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.worker.error',
        eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
        eventScope: `job-service:worker`,
        eventData: {
          workerId: worker.id,
          message: `Worker ${worker.id} for queue '${worker.name}' has failed with error '${err.message}'`,
          error: err,
        },
      })
    );
  };

const setupWorkerEvents = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, worker: Worker): void => {
    // Set up worker event handlers
    worker.on('ready', () => {
      emitWorkerReady(dependencies)(queueName, worker);
    });

    worker.on('active', (job) => {
      emitWorkerStarted(dependencies)(queueName, worker, job);
    });

    worker.on('completed', (job) => {
      emitWorkerCompleted(dependencies)(queueName, worker, job);
    });

    worker.on('paused', () => {
      emitWorkerPaused(dependencies)(queueName, worker);
    });

    worker.on('resumed', () => {
      emitWorkerResumed(dependencies)(queueName, worker);
    });

    worker.on('stalled', (jobId) => {
      emitWorkerStalled(dependencies)(queueName, worker, jobId);
    });

    worker.on('failed', (job, err) => {
      if (!job) {
        emitWorkerFailed(dependencies)(queueName, worker, err);
      } else {
        emitJobFailed(dependencies)(queueName, worker, job, err);
      }
    });

    worker.on('closed', () => {
      emitWorkerClosed(dependencies)(worker);
    });

    worker.on('error', (err) => {
      emitWorkerError(dependencies)(worker, err);
    });
  };

type BullMQState = {
  redisOptions: RedisOptions;
  queues: Map<string, Queue>;
  workers: Map<string, readonly Worker[]>;
};

const createState = (redisOptions: RedisOptions): BullMQState => ({
  redisOptions,
  queues: new Map(),
  workers: new Map(),
});

const emitQueueAdded = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, queue: Queue): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.queue.added',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:queue`,
        eventData: {
          queueName,
          message: `Queue with name '${queueName}' has been added`,
        },
      })
    );
  };

export type JobHandler<T> = (job: Job<T>) => Promise<void>;

export type QueueConfig = {
  name: string;
  numWorkers?: number;
  queueOptions?: Omit<QueueOptions, 'connection'>;
  workerOptions?: WorkerOptions;
};

const emitQueuePaused = <D extends Dependencies>(dependencies: D) =>
  (queue: Queue): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.queue.paused',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:queue`,
        eventData: {
          queueName: queue.name,
          message: `Queue '${queue.name}' has been paused`,
        },
      })
    );
  };

const emitQueueResumed = <D extends Dependencies>(dependencies: D) =>
  (queue: Queue): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.queue.resumed',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:queue`,
        eventData: {
          queueName: queue.name,
          message: `Queue '${queue.name}' has been resumed`,
        },
      })
    );
  };

const emitQueueError = <D extends Dependencies>(dependencies: D) =>
  (queue: Queue, err: Error): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.queue.error',
        eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
        eventScope: `job-service:queue`,
        eventData: {
          queueName: queue.name,
          error: err,
          message: `Queue '${queue.name}' has failed with error '${err.message}'`,
        },
      })
    );
  };

const setupQueueEvents = <D extends Dependencies>(dependencies: D) =>
  (queue: Queue): void => {
    queue.on('paused', () => {
      emitQueuePaused(dependencies)(queue);
    });
    queue.on('resumed', () => {
      emitQueueResumed(dependencies)(queue);
    });
    queue.on('error', (err) => {
      emitQueueError(dependencies)(queue, err);
    });
  };

export type AddQueueResult = {
  queue: Queue;
  workers: readonly Worker[];
};

const addQueue = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    <T>(config: QueueConfig, handler: (data: T) => Promise<void>): AddQueueResult => {
      const { name: queueName, queueOptions, workerOptions } = config;
      const queue = new Queue(
        queueName,
        {
          connection: new IORedis(state.redisOptions),
          ...queueOptions,
        }
      );
      state.queues.set(queueName, queue);
      setupQueueEvents(dependencies)(queue);
      const workers = Array
        .from({ length: config.numWorkers ?? 1 })
        .map(() => {
          const worker = new Worker(
            queueName,
            async (job: Job) => {
              await handler(job.data);
            },
            {
              connection: new IORedis(state.redisOptions),
              ...workerOptions,
            }
          );
          setupWorkerEvents(dependencies)(queueName, worker);
          return worker;
        });
      state.workers.set(queueName, workers);
      emitQueueAdded(dependencies)(queueName, queue);
      return {
        queue,
        workers,
      };
    };

const stopQueue = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async (queueName: string): Promise<boolean> => {
      const queue = state.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      // Stop workers first
      const workers = state.workers.get(queueName) ?? [];
      for (const worker of workers) {
        await worker.close();
        const workerConnection = worker['connection'];
        const workerClient = await workerConnection.client;
        if (workerClient) {
          await workerClient.quit();
        }
      }
      state.workers.delete(queueName);

      // Then close the queue
      await queue.close();
      const queueConnection = queue['connection'];
      const queueClient = await queueConnection.client;
      if (queueClient) {
        await queueClient.quit();
      }
      emitQueueClosed(dependencies)(queue);
      state.queues.delete(queueName);

      return true;
    };

const pauseQueue = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async (queueName: string): Promise<boolean> => {
      const queue = state.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }
      await queue.pause();
      return true;
    };

const resumeQueue = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async (queueName: string): Promise<boolean> => {
      const queue = state.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }
      await queue.resume();
      return true;
    };

const emitJobAdded = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, job: Job): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.job.added',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:job`,
        eventData: {
          jobId: job.id,
          queueName,
          message: `Job ${job.id} added to queue '${queueName}'`,
          data: job.data,
        },
      })
    );
  };

const enqueueJob = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async <T>(queueName: string, data: T): Promise<jobs.JobEntry<T>> => {
      const queue = state.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }
      const job = await queue.add('job', data);
      emitJobAdded(dependencies)(queueName, job);
      return {
        id: job.id ?? '',
        data,
      };
    };

const start = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async (): Promise<boolean> => {
      for (const workers of state.workers.values()) {
        for (const worker of workers) {
          if (!worker.isRunning()) {
            worker.run();
          }
        }
      }
      return true;
    };

const pause = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async (): Promise<boolean> => {
      for (const queue of state.queues.values()) {
        if (!(await queue.isPaused())) {
          await queue.pause();
        }
      }
      return true;
    };

const resume = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async (): Promise<boolean> => {
      for (const queue of state.queues.values()) {
        if (await queue.isPaused()) {
          await queue.resume();
        }
      }
      return true;
    };

const emitWorkerClosed = <D extends Dependencies>(dependencies: D) =>
  (worker: Worker): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.worker.closed',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:worker`,
        eventData: {
          workerId: worker.id,
          queueName: worker.name,
          message: `Worker ${worker.id} for queue '${worker.name}' has been closed`,
        },
      })
    );
  };

const emitQueueClosed = <D extends Dependencies>(dependencies: D) =>
  (queue: Queue): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.queue.closed',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:queue`,
        eventData: {
          queueName: queue.name,
          message: `Queue '${queue.name}' has been closed`,
        },
      })
    );
  };

const stop = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async (): Promise<boolean> => {
      for (const queue of state.queues.values()) {
        await stopQueue(dependencies)(state)(queue.name);
      }
      return true;
    };

const emitJobRetrying = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, job: Job): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.NOOP,
        eventName: 'job-service.job.retry',
        eventSeverity: observability.eventSeverity.EventSeverity.INFO,
        eventScope: `job-service:job`,
        eventData: {
          queueName,
          jobId: job.id,
          data: job.data,
          message: `Job with job id: ${job.id} is being retried`
        },
      })
    );
  };

const retryJob = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async <T>(queueName: string, jobID: string): Promise<jobs.JobEntry<T>> => {
      const queue = state.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }
      const job = await queue.getJob(jobID);
      if (!job) {
        throw new Error(`Job '${jobID}' not found in queue '${queueName}'`);
      }
      await job.retry();
      emitJobRetrying(dependencies)(queueName, job);
      return {
        id: job.id ?? '',
        data: job.data,
      };
    };

const emitFailedJobsRead = <D extends Dependencies>(dependencies: D) =>
  (queueName: string, failedJobs: readonly Job[]): void => {
    dependencies.observabilityService.emit(
      observability.event({
        eventType: observability.EventType.READ,
        eventName: 'job-service.queue.jobs.failed.read',
        eventSeverity: observability.eventSeverity.EventSeverity.TRACE,
        eventScope: `job-service:queue`,
        eventData: {
          queueName,
          failedJobs,
          message: `Failed jobs have been read for queue with name: '${queueName}'`
        },
      })
    );
  };

const getFailedJobs = <D extends Dependencies>(dependencies: D) =>
  (state: BullMQState) =>
    async <T>(queueName: string): Promise<readonly jobs.FailedJobEntry<T>[]> => {
      const queue = state.queues.get(queueName);
      if (!queue) {
        return [];
      }
      const failedJobs = await queue.getFailed();
      emitFailedJobsRead(dependencies)(queueName, failedJobs);
      return failedJobs.map((job) => ({
        id:   job.id ?? '',
        data: job.data,
        stacktrace: job.stacktrace,
        attemptsMade: job.attemptsMade,
        attemptsAllowed: job.opts.attempts ?? 0,
      }));
    };

export type JobServiceConfig = {
  redis: RedisOptions;
}

export const createJobServiceProvider = (config: JobServiceConfig): di.Provider<Dependencies, jobs.JobService<QueueConfig, AddQueueResult>> =>
  (dependencies: Dependencies): jobs.JobService<QueueConfig, AddQueueResult> => {
    const state = createState(config.redis);
    return {
      start: start(dependencies)(state),
      pause: pause(dependencies)(state),
      resume: resume(dependencies)(state),
      stop: stop(dependencies)(state),
      addQueue: addQueue(dependencies)(state),
      stopQueue: stopQueue(dependencies)(state),
      pauseQueue: pauseQueue(dependencies)(state),
      resumeQueue: resumeQueue(dependencies)(state),
      enqueueJob: enqueueJob(dependencies)(state),
      retryJob: retryJob(dependencies)(state),
      getFailedJobs: getFailedJobs(dependencies)(state),
    };
  };
