import * as logger from "../logger";

export type Dependencies = {
  eventLogger: logger.events.EventLogger;
  logger: logger.Logger;
}
