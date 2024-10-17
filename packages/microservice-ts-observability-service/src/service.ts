import { di, observability } from '@jrball3/microservice-ts';

export const createProvider = (): di.Provider<unknown, observability.ObservabilityService> => () => {
  const globalRegistry: observability.ObservableHandler[] = [];
  const keyedRegistry = new Map<string, observability.ObservableHandler[]>();
  const keyFromEvent = (event: observability.Event): string => `${event.eventType}-${event.eventName}`;
  const keyFromFilter = (filter: observability.EventFilter): string | undefined => {
    if (!filter.eventType && !filter.eventName) {
      return undefined;
    }
    const eventType = filter.eventType ? `-${filter.eventType}` : '';
    const eventName = filter.eventName ? `-${filter.eventName}` : '';
    return `${eventType}${eventName}`;
  };
  return {
    on: (filter: observability.EventFilter, handler: observability.ObservableHandler): void => {
      const key = keyFromFilter(filter);
      if (key) {
        const handlers = keyedRegistry.get(key) ?? [];
        handlers.push(handler);
        keyedRegistry.set(key, handlers);
      } else {
        globalRegistry.push(handler);
      }
    },
    emit: (event: observability.Event): void => {
      const handlers = [
        ...globalRegistry,
        ...(keyedRegistry.get(keyFromEvent(event)) ?? []),
      ];
      handlers.forEach((handler) => handler(event));
    },
  };
};
