import { LogConfig } from './log-config';
import { RouteConfig } from './route-config';

/**
 * HTTP configuration
 */
export type HttpConfig = {
  provider: string;
  host: string;
  port: number;
  logging: LogConfig;
  routes: RouteConfig[];
};
