import { EventEmitter, once } from 'events';
import { createRetryDlqServiceProvider } from '../retry-dlq';
import { jobs, messaging, observability } from '@jrball3/microservice-ts';
import { AddQueueResult, createJobServiceProvider, QueueConfig } from '../job-service';

describe('RetryDlqService', () => {
  let jobService: jobs.JobService<QueueConfig, AddQueueResult>;
  let retryDlqService: messaging.retryDlq.RetryDlqService;
  let observabilityService: observability.ObservabilityService;
  let capturedEvents: any[] = [];
  let topicName: string;
  let consumerGroupName: string;
  let consumerHandler: jest.Mock;
  let producerHandler: jest.Mock;
  let consumerName: string;
  let producerName: string;

  beforeAll(async () => {
    observabilityService = {
      emit: (event: any) => {
        capturedEvents.push(event);
      },
    } as any;
    jobService = createJobServiceProvider({
      redis: {
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
        lazyConnect: true,
      },
    })({ observabilityService: observabilityService });
    await jobService.start();
  });

  afterAll(async () => {
    await jobService.stop();
  });

  beforeEach(async () => {
    topicName = `test-topic-${Math.random()}`;
    consumerGroupName = `test-consumer-group-${Math.random()}`;
    consumerHandler = jest.fn();
    producerHandler = jest.fn();
    consumerName = `test-consumer-${Math.random()}`;
    producerName = `test-producer-${Math.random()}`;
    retryDlqService = createRetryDlqServiceProvider({
      [consumerName]: {
        identifier: {
          topic: topicName,
          consumerGroup: consumerGroupName,
        },
        attempts: 3,
        handler: (_deps) => consumerHandler,
      },
      [producerName]: {
        identifier: {
          producer: producerName,
        },
        attempts: 3,
        handler: (_deps) => producerHandler,
      },
    })({
      observabilityService,
      jobService,
    });
    await retryDlqService.start();
  });

  afterEach(async () => {
    await retryDlqService.stop();
  });

  it('enqueues consumer retry', async () => {
    const job = await retryDlqService.enqueueConsumerRetry(
      topicName,
      consumerGroupName,
      { data: 'test' },
    );
    expect(job.id).toBeDefined();
    expect(job.data).toEqual({ data: 'test' });
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(consumerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is not in the dlq
    const dlq = await retryDlqService.getConsumerDlq(topicName, consumerGroupName);
    expect(dlq.length).toBe(0);
  });

  it('enqueues producer retry', async () => {
    const job = await retryDlqService.enqueueProducerRetry(producerName, { data: 'test' });
    expect(job.id).toBeDefined();
    expect(job.data).toEqual({ data: 'test' });
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(producerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is not in the dlq
    const dlq = await retryDlqService.getProducerDlq(producerName);
    expect(dlq.length).toBe(0);
  });

  it('consumer jobs that have retries remaining are not moved to the dlq', async () => {
    let attempt = 0;
    const blocker = new EventEmitter();
    consumerHandler.mockImplementation(async (data: any) => {
      attempt++;
      if (attempt < 2) {
        throw new Error('test');
      }
      // Wait for the 'continue' event
      await once(blocker, 'continue');
      return Promise.resolve();
    });
    const job = await retryDlqService.enqueueConsumerRetry(topicName, consumerGroupName, { data: 'test' });
    // wait for the job to be processed the first time
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(consumerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is not in the dlq
    const dlq = await retryDlqService.getConsumerDlq(topicName, consumerGroupName);
    expect(dlq.length).toBe(0);
    // unblock the handler
    blocker.emit('continue');
    // wait for the job to be processed the second time
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(consumerHandler).toHaveBeenCalledTimes(2);
    expect(consumerHandler).toHaveBeenCalledWith(job.data);
  });

  it('producer jobs that have retries remaining are not moved to the dlq', async () => {
    let attempt = 0;
    const blocker = new EventEmitter();
    producerHandler.mockImplementation(async (data: any) => {
      attempt++;
      if (attempt < 2) {
        throw new Error('test');
      }
      // Wait for the 'continue' event
      await once(blocker, 'continue');
      return Promise.resolve();
    });
    const job = await retryDlqService.enqueueProducerRetry(producerName, { data: 'test' });
    // wait for the job to be processed the first time
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(producerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is not in the dlq
    const dlq = await retryDlqService.getProducerDlq(producerName);
    expect(dlq.length).toBe(0);
    // unblock the handler
    blocker.emit('continue');
    // wait for the job to be processed the second time
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(producerHandler).toHaveBeenCalledTimes(2);
    expect(producerHandler).toHaveBeenCalledWith(job.data);
  });

  it('moves consumer jobs with no retries remaining to the dlq', async () => {
    consumerHandler.mockImplementation(() => { throw new Error('test'); });
    const job = await retryDlqService.enqueueConsumerRetry(topicName, consumerGroupName, { data: 'test' });
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(consumerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is in the dlq
    const dlq = await retryDlqService.getConsumerDlq(topicName, consumerGroupName);
    expect(dlq.length).toBe(1);
  });

  it('moves producer jobs with no retries remaining to the dlq', async () => {
    producerHandler.mockImplementation(() => { throw new Error('test'); });
    const job = await retryDlqService.enqueueProducerRetry(producerName, { data: 'test' });
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(producerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is in the dlq
    const dlq = await retryDlqService.getProducerDlq(producerName);
    expect(dlq.length).toBe(1);
  });

  it('revives dead consumer jobs', async () => {
    // handler that fails only the first 3 times
    let attempt = 0;
    consumerHandler.mockImplementation(async (data: any) => {
      if (attempt < 3) {
        attempt++;
        throw new Error('test');
      }
      return Promise.resolve();
    });
    const job = await retryDlqService.enqueueConsumerRetry(topicName, consumerGroupName, { data: 'test' });
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(consumerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is in the dlq
    const dlq = await retryDlqService.getConsumerDlq(topicName, consumerGroupName);
    expect(dlq.length).toBe(1);
    // attempt to revive the job
    const revived = await retryDlqService.reviveConsumerDlq(topicName, consumerGroupName, dlq[0].id);
    expect(revived).toBeDefined();
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(consumerHandler).toHaveBeenCalledTimes(4);
    expect(consumerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is not in the dlq
    const dlq2 = await retryDlqService.getConsumerDlq(topicName, consumerGroupName);
    expect(dlq2.length).toBe(0);
  });

  it('revives dead producer jobs', async () => {
    // handler that fails only the first 3 times
    let attempt = 0;
    producerHandler.mockImplementation(async (data: any) => {
      if (attempt < 3) {
        attempt++;
        throw new Error('test');
      }
      return Promise.resolve();
    });
    const job = await retryDlqService.enqueueProducerRetry(producerName, { data: 'test' });
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(producerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is in the dlq
    const dlq = await retryDlqService.getProducerDlq(producerName);
    expect(dlq.length).toBe(1);
    // attempt to revive the job
    const revived = await retryDlqService.reviveProducerDlq(producerName, dlq[0].id);
    expect(revived).toBeDefined();
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(producerHandler).toHaveBeenCalledTimes(4);
    expect(producerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is not in the dlq
    const dlq2 = await retryDlqService.getProducerDlq(producerName);
    expect(dlq2.length).toBe(0);
  });

  it('dead consumer jobs that fail revival remain in the dlq', async () => {
    consumerHandler.mockImplementation(() => { throw new Error('test'); });
    const job = await retryDlqService.enqueueConsumerRetry(topicName, consumerGroupName, { data: 'test' });
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(consumerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is in the dlq
    const dlq = await retryDlqService.getConsumerDlq(topicName, consumerGroupName);
    expect(dlq.length).toBe(1);
    // attempt to revive the job
    const revived = await retryDlqService.reviveConsumerDlq(topicName, consumerGroupName, dlq[0].id);
    expect(revived).toBeDefined();
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    // make sure the job remains in the dlq
    const dlq2 = await retryDlqService.getConsumerDlq(topicName, consumerGroupName);
    expect(dlq2.length).toBe(1);
    expect(dlq2[0].attemptsMade).toBe(dlq[0].attemptsMade + 1);
    expect(dlq2[0].attemptsAllowed).toBe(3);
  });

  it('dead producer jobs that fail revival remain in the dlq', async () => {
    producerHandler.mockImplementation(() => { throw new Error('test'); });
    const job = await retryDlqService.enqueueProducerRetry(producerName, { data: 'test' });
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(producerHandler).toHaveBeenCalledWith(job.data);
    // make sure the job is in the dlq
    const dlq = await retryDlqService.getProducerDlq(producerName);
    expect(dlq.length).toBe(1);
    // attempt to revive the job
    const revived = await retryDlqService.reviveProducerDlq(producerName, dlq[0].id);
    expect(revived).toBeDefined();
    // wait for the job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    // make sure the job remains in the dlq
    const dlq2 = await retryDlqService.getProducerDlq(producerName);
    expect(dlq2.length).toBe(1);
    expect(dlq2[0].attemptsMade).toBe(dlq[0].attemptsMade + 1);
    expect(dlq2[0].attemptsAllowed).toBe(3);
  });

});
