import * as http from './http';
import * as nodehttp from 'http';
import { MicroserviceConfig } from './config';
import { Dependencies } from './dependencies';

/**
 * Builds a microservice
 * @param dependencies - The dependencies
 * @returns A function that builds a microservice
 */
export const build = (dependencies: Dependencies) =>
  (config: MicroserviceConfig): nodehttp.Server => {
    const httpProvider = http.providers.registry.get(config.http.provider);
    if (!httpProvider) {
      throw new Error(`HTTP provider '${config.http.provider}' not found`);
    }
    return httpProvider.buildServer(dependencies)(config.http);
  };
