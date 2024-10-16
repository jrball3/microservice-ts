import { Dependencies } from '../dependencies';
import { RouteDefinition } from '../route-definition';
import { LogConfig } from './log-config';

/**
 * HTTP configuration
 */
export type HttpConfig<D extends Dependencies = Dependencies> = {
  host: string;
  port: number;
  logging: LogConfig;
  routes: RouteDefinition<D>[];
};
