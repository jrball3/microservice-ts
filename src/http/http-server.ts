export interface HttpServer {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}
