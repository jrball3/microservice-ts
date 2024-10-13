export type EventData = {
  [key: string]: unknown;
}

export type Event = {
  eventType: string;
  eventName: string;
  eventData: EventData;
  eventTimestamp: Date;
}

const generateTimestamp = () => new Date();

export type EventParams = {
  eventType: string;
  eventName: string;
  eventData: EventData;
  eventTimestamp?: Date;
}

export const event = (params: EventParams): Event => ({
  eventTimestamp: generateTimestamp(),
  ...params,
});

