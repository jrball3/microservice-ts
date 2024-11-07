import { jobs, observability } from '@jrball3/microservice-ts';
import { Queue, Worker } from 'bullmq';
import { AddQueueResult, createJobServiceProvider, JobHandler, QueueConfig } from '../job-service';

describe('JobService', () => {
  let jobService: jobs.JobService<QueueConfig, AddQueueResult>;
  let events: any[] = [];

  const mockObservability: observability.ObservabilityService = {
    emit: (event: any) => {
      events.push(event);
    },
  } as any;

  beforeAll(async () => {
    const jobServiceProvider = createJobServiceProvider({ 
      redis: {
        host: 'localhost', 
        port: 6379, 
        maxRetriesPerRequest: null,
        lazyConnect: true,
      }
    });
    jobService = jobServiceProvider({ observabilityService: mockObservability });
    await jobService.start();
  });

  beforeEach(async () => {
    events = [];
  });

  afterAll(async () => {
    await jobService.stop();
  });

  it('creates a queue and workers', async () => {
    const mockHandler: JobHandler<any> = async () => {};
    const queueConfig: QueueConfig = {
      name: `testQueue-${Math.random()}`,
      numWorkers: 2,
    };

    const result = jobService.addQueue(queueConfig, mockHandler);
    expect(result.queue).toBeInstanceOf(Queue);
    expect(result.workers).toHaveLength(2);
    expect(result.workers[0]).toBeInstanceOf(Worker);
    expect(result.workers[1]).toBeInstanceOf(Worker);
    expect(result.workers[0].isRunning()).toBe(true);
    expect(result.workers[1].isRunning()).toBe(true);

    // Wait for workers to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.worker.ready',
        eventScope: 'job-service:worker',
        eventData: { 
          queueName: queueConfig.name,
          workerId: result.workers[0].id,
          message: `Worker ${result.workers[0].id} for queue '${queueConfig.name}' is ready to process jobs`,
        }
      })
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.worker.ready',
        eventScope: 'job-service:worker',
        eventData: { 
          queueName: queueConfig.name,
          workerId: result.workers[1].id,
          message: `Worker ${result.workers[1].id} for queue '${queueConfig.name}' is ready to process jobs`,
        }
      })
    );
  });

  it('pauses and resumes', async () => {
    const queueName = `testPauseResumeQueue-${Math.random()}`;
    const addResult = jobService.addQueue({ name: queueName }, async () => {});
    await jobService.pause();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(await addResult.queue.isPaused()).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.queue.paused',
        eventScope: `job-service:queue`,
        eventData: {
          queueName,
          message: `Queue '${queueName}' has been paused`,
        }
      })
    );
    await jobService.resume();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(await addResult.queue.isPaused()).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.queue.resumed',
        eventScope: `job-service:queue`,
        eventData: {
          queueName,
          message: `Queue '${queueName}' has been resumed`,
        }
      })
    );
  });

  it('stops one queue', async () => {
    const queueName = `testStopQueue-${Math.random()}`;
    const queue = jobService.addQueue({ name: queueName }, async () => {});
    await new Promise(resolve => setTimeout(resolve, 1000));
    await jobService.stopQueue(queueName);
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(queue.workers[0].isRunning()).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.worker.closed',
        eventScope: `job-service:worker`,
        eventData: {
          queueName,
          message: `Worker ${queue.workers[0].id} for queue '${queueName}' has been closed`,
          workerId: queue.workers[0].id,
        }
      })
    );
  });

  it('pauses and resumes a queue', async () => {
    const queueName = `testPauseQueue-${Math.random()}`;
    const addResult = jobService.addQueue({ name: queueName }, async () => {});
    await jobService.pauseQueue(queueName);
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(await addResult.queue.isPaused()).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.queue.paused',
        eventScope: `job-service:queue`,
        eventData: { 
          queueName, 
          message: `Queue '${queueName}' has been paused`,
        }
      })
    );
    await jobService.resumeQueue(queueName);
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(await addResult.queue.isPaused()).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.queue.resumed',
        eventScope: `job-service:queue`,
        eventData: { 
          queueName, 
          message: `Queue '${queueName}' has been resumed`,
        }
      })
    );
  });

  it('adds a job to a queue', async () => {
    const queueName = `testEnqueueQueue-${Math.random()}`;
    type JobData = { test: string };
    const jobData: JobData = { test: 'data' };

    let processedData: JobData | undefined;
    const handler = async (data: JobData) => {
      processedData = data;
    };

    const newQueue = jobService.addQueue({ name: queueName }, handler);
    const result = await jobService.enqueueJob(queueName, jobData);
    expect(newQueue.workers[0].isRunning()).toBe(true);

    expect(result).toMatchObject({
      id: expect.any(String),
      data: jobData,
    });

    // Wait for job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(processedData).not.toBeUndefined();
    expect(processedData).toEqual(jobData);

    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.job.added',
        eventScope: 'job-service:job',
        eventData: {
          jobId: result.id,
          queueName,
          message: `Job ${result.id} added to queue '${queueName}'`,
          data: jobData,
        }
      })
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.job.completed',
        eventScope: 'job-service:job',
        eventData: {
          jobId: result.id,
          queueName,
          workerId: newQueue.workers[0].id,
          message: `Job ${result.id} in queue '${queueName}' has been completed`,
        }
      })
    );
  });

  it('fails to add a job to a nonexistent queue', async () => {
    await expect(jobService.enqueueJob('nonexistentQueue', {})).rejects.toThrow(
      "Queue 'nonexistentQueue' not found"
    );
  });

  it('gets failed jobs', async () => {
    const failedJobs = await jobService.getFailedJobs('testQueue');
    expect(failedJobs).toEqual([]);
  });

  it('retries a job', async () => {
    let attempt = 0;
    const queueName = `testRetryQueue-${Math.random()}`;
    const newQueue = jobService.addQueue(
      { name: queueName }, 
      async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error('test');
        }
      });
    const job = await jobService.enqueueJob(queueName, { test: 'data' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const failedJobs = await jobService.getFailedJobs(queueName);
    expect(failedJobs).toHaveLength(1);
    const result = await jobService.retryJob(queueName, job.id ?? '');
    expect(result.id).toEqual(job.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const failedJobs2 = await jobService.getFailedJobs(queueName);
    expect(failedJobs2).toHaveLength(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.job.retry',
        eventScope: `job-service:job`,
        eventData: {
          queueName,
          jobId: job.id,
          data: job.data,
          message: `Job with job id: ${job.id} is being retried`,
        }
      })
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.job.completed',
        eventScope: `job-service:job`,
        eventData: {
          jobId: result.id,
          queueName,
          workerId: newQueue.workers[0].id,
          message: `Job ${result.id} in queue '${queueName}' has been completed`,
        }
      })
    );
  });

  it('stops all workers and queues', async () => {
    const queueName = `testStopQueue-${Math.random()}`;
    const addResult = jobService.addQueue({ name: queueName }, async () => {});

    const result = await jobService.stop();

    expect(result).toBe(true);

    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.worker.closed',
        eventScope: `job-service:worker`,
        eventData: {
          queueName,
          workerId: addResult.workers[0].id,
          message: `Worker ${addResult.workers[0].id} for queue '${queueName}' has been closed`,
        }
      })
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        eventName: 'job-service.queue.closed',
        eventScope: `job-service:queue`,
        eventData: {
          queueName,
          message: `Queue '${queueName}' has been closed`,
        }
      })
    );

    // Verify that the queue is actually closed
    await expect(jobService.enqueueJob(queueName, {})).rejects.toThrow();
  });
});
