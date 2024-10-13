/**
 * Event data
 */
export type EventData = {
  [key: string]: unknown;
};

/**
 * An event
 */
export type Event = {
  eventType: string;
  eventName: string;
  eventData: EventData;
  eventTimestamp: Date;
};

const generateTimestamp = (): Date => new Date();

/**
 * Event parameters
 */
export type EventParams = {
  eventType: string;
  eventName: string;
  eventData: EventData;
  eventTimestamp?: Date;
};

/**
 * Creates an event
 * @param params - The event parameters
 * @returns An event
 */
export const event = (params: EventParams): Event => ({
  eventTimestamp: generateTimestamp(),
  ...params,
});
