
/**
 * Represents a job entry.
 */
export type JobEntry<T> = {
  id: string;
  data: T;
}

/**
 * Represents a failed job entry.
 */
export type FailedJobEntry<T> = JobEntry<T> & {
  stacktrace: string[];
  attemptsMade: number;
  attemptsAllowed: number;
}
  
/**
 * Represents a job service.
 */
export type JobService<QueueConfig, AddQueueResult> = {
  /**
   * Starts the job service.
   */
  start: () => Promise<boolean>;
  /**
   * Pauses the job service.
   */
  pause: () => Promise<boolean>;
  /**
   * Resumes the job service.
   */
  resume: () => Promise<boolean>;
  /**
   * Stops the job service.
   */
  stop: () => Promise<boolean>;
  /**
   * Adds a queue to the job service.
   */
  addQueue: <T>(config: QueueConfig, handler: (data: T) => Promise<void>) => AddQueueResult;
  /**
   * Stops a queue.
   */
  stopQueue: (queueName: string) => Promise<boolean>;
  /**
   * Pauses a queue.
   */
  pauseQueue: (queueName: string) => Promise<boolean>;
  /**
   * Resumes a queue.
   */
  resumeQueue: (queueName: string) => Promise<boolean>;
  /**
   * Enqueues a job to a queue.
   */
  enqueueJob: <T>(queueName: string, data: T) => Promise<JobEntry<T>>;
  /**
   * Retries a job.
   */
  retryJob: <T>(queueName: string, jobId: string) => Promise<JobEntry<T>>;
  /**
   * Gets failed jobs for a queue.
   */
  getFailedJobs: <T>(queueName: string) => Promise<readonly FailedJobEntry<T>[]>;
}
