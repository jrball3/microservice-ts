import * as di from '../../../di';
import { Event } from '../../event';
import { EventFilter, ObservabilityService, ObservableHandler } from '../../observability';

export const createProvider = (): di.Provider<unknown, ObservabilityService> => () => {
  const globalRegistry: ObservableHandler[] = [];
  const keyedRegistry = new Map<string, ObservableHandler[]>();
  const keyFromEvent = (event: Event): string => `${event.eventType}-${event.eventName}`;
  const keyFromFilter = (filter: EventFilter): string | undefined => {
    if (!filter.eventType && !filter.eventName) {
      return undefined;
    }
    const eventType = filter.eventType ? `-${filter.eventType}` : '';
    const eventName = filter.eventName ? `-${filter.eventName}` : '';
    return `${eventType}${eventName}`;
  };
  return {
    on: (filter: EventFilter, handler: ObservableHandler): void => {
      const key = keyFromFilter(filter);
      if (key) {
        const handlers = keyedRegistry.get(key) ?? [];
        handlers.push(handler);
        keyedRegistry.set(key, handlers);
      } else {
        globalRegistry.push(handler);
      }
    },
    emit: (event: Event): void => {
      const handlers = [
        ...globalRegistry,
        ...(keyedRegistry.get(keyFromEvent(event)) ?? []),
      ];
      handlers.forEach((handler) => handler(event));
    },
  };
};
