import { LogLevel } from './logging';

export type LoggingConfig = {
  provider: string;
  level: LogLevel;
};
