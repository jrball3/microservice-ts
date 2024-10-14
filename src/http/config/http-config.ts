import { RouteDefinition } from '../route-definition';
import { LogConfig } from './log-config';

/**
 * HTTP configuration
 */
export type HttpConfig = {
  host: string;
  port: number;
  logging: LogConfig;
  routes: RouteDefinition[];
};
