import { HttpMethod } from './method';

/**
 * A request context
 */
export type RequestContext = {
  // Core properties
  requestId: string;
  timestamp: Date;
  method: HttpMethod;
  path: string;
  url: string;
  protocol: string;
  hostname: string;
  ip: string;

  // Common headers (as optional properties)
  userAgent?: string;
  referer?: string;
  contentType?: string;
  acceptLanguage?: string;

  // Provider-specific extensions
  [key: string]: unknown;
};
