import express from 'express';
import http from 'http';
import * as config from "../config";

export const start = (config: config.HttpConfig) => (app: express.Application): http.Server => {
  return app.listen(config.port, config.host, () => {
    console.log(`Server is running on port ${config.port}`);
  });
}
