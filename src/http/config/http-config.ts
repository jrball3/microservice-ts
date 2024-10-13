import { LogConfig } from "./log-config";
import { RouteConfig } from "./route-config";

export type HttpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  logging: LogConfig;
  routes: RouteConfig[];
}
