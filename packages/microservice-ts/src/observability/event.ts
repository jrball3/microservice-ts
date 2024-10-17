import { EventSeverity } from './event-severity';

/**
 * Event data
 */
export type EventData = {
  [key: string]: unknown;
};

export enum EventType {
  NOOP = 'noop',
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
}

/**
 * An event
 */
export type Event = {
  eventType: EventType;
  eventName: string;
  eventSeverity: EventSeverity;
  eventScope: string;
  eventData: EventData;
  eventTimestamp: Date;
};

const generateTimestamp = (): Date => new Date();

/**
 * Event parameters
 */
export type EventParams = Omit<Event, 'eventTimestamp'> & {
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
