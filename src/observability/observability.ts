import { Event } from './event';

export type ObservableHandler = (event: Event) => void;

export type EventFilter = {
  eventType?: string;
  eventName?: string;
};

export type ObservabilityService = {
  on: (filter: EventFilter, handler: ObservableHandler) => void;
  emit: (event: Event) => void;
};
