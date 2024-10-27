import { messaging, observability } from '@jrball3/microservice-ts';
import { Consumer } from 'kafkajs';
import { KafkaConsumer, KafkaConsumerConfig } from './kafka';

/**
 * Creates a Kafka consumer from a consumer
 * @param dependencies - The event consumer dependencies
 * @param config - The Kafka consumer configuration
 * @param consumer - The Kafka consumer
 * @returns A Kafka consumer
 */
export const fromConsumer = <D extends messaging.consumer.Dependencies = messaging.consumer.Dependencies>(dependencies: D) =>
  (config: KafkaConsumerConfig<D>, consumer: Consumer): KafkaConsumer => {
    const { observabilityService } = dependencies;
    return {
      consumer,
      connect: async (): Promise<boolean> => {
        try {
          await consumer.connect();
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.connect.success',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
                topics: config.consumer.subscribeTopics.topics,
              },
            }),
          );
          return true;
        } catch (error) {
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.connect.error',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
              eventData: {
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
                error: error,
              },
            }),
          );
          throw error;
        }
      },
      disconnect: async (): Promise<boolean> => {
        try {
          await consumer.disconnect();
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.disconnect.success',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
              },
            }),
          );
          return true;
        } catch (error) {
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.disconnect.error',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
              eventData: {
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
                error,
              },
            }),
          );
          throw error;
        }
      },
      start: async (): Promise<boolean> => {
        try {
          await consumer.subscribe(config.consumer.subscribeTopics);
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.subscribe.success',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
                topics: config.consumer.subscribeTopics.topics,
              },
            }),
          );
          await consumer.run({
            ...config.consumer.runConfig,
            eachBatch: config.consumer.runConfig.eachBatch?.(dependencies),
            eachMessage: config.consumer.runConfig.eachMessage?.(dependencies),
          });
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.run.success',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
              },
            }),
          );
          return true;
        } catch (error) {
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.start.error',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
              eventData: { 
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
                error,
              },
            }),
          );
          throw error;
        }
      },
      stop: async (): Promise<boolean> => {
        try {
          await consumer.stop();
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.stop.success',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
              },
            }),
          );
          return true;
        } catch (error) {
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.stop.error',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
              eventData: {
                clientId: config.kafka.clientId,
                groupId: config.consumer.groupId,
                error,
              },
            }),
          );
          throw error;
        }
      },
    };
  };
  