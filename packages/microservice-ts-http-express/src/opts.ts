import * as express from 'express';

/**
 * Options for the Express provider
 */
export type ExpressProviderOpts = {
  /**
   * Extracts additional request context from the request
   * @param req - The request
   * @returns The request context
   */
  extractRequestContext?: (req: express.Request) => Record<string, unknown>;
};
