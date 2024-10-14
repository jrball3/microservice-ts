import * as http from '../http';
import * as logging from '../logging';
import { Provider } from './provider';

export type Dependencies = {
  httpProvider?: Provider<http.Dependencies, http.HttpServer>;
  loggingProvider?: Provider<logging.Dependencies, logging.Logger>;
};
