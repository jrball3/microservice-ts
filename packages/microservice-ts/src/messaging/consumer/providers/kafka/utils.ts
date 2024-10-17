import { Consumer } from 'kafkajs';
import * as observability from '../../../../observability';
import { Dependencies } from '../../dependencies';
import { KafkaConsumer, KafkaConsumerConfig } from './kafka';

/**
 * Creates a Kafka consumer from a consumer
 * @param dependencies - The event consumer dependencies
 * @param config - The Kafka consumer configuration
 * @param consumer - The Kafka consumer
 * @returns A Kafka consumer
 */
export const fromConsumer = <D extends Dependencies = Dependencies>(dependencies: D) =>
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
                clientId: config.clientId,
                brokers: config.brokers,
                groupId: config.groupId,
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
                clientId: config.clientId,
                brokers: config.brokers,
                groupId: config.groupId,
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
              eventData: { error },
            }),
          );
          throw error;
        }
      },
      start: async (): Promise<boolean> => {
        try {
          await consumer.subscribe(config.subscribeTopics);
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.subscribe.success',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.clientId,
                brokers: config.brokers,
                groupId: config.groupId,
                topics: config.subscribeTopics.topics,
              },
            }),
          );
          await consumer.run({
            ...config.runConfig,
            eachBatch: config.runConfig.eachBatch?.(dependencies),
            eachMessage: config.runConfig.eachMessage?.(dependencies),
          });
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.consumer.run.success',
              eventScope: 'kafka.consumer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.clientId,
                brokers: config.brokers,
                groupId: config.groupId,
                topics: config.subscribeTopics.topics,
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
              eventData: { error },
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
                clientId: config.clientId,
                brokers: config.brokers,
                groupId: config.groupId,
                topics: config.subscribeTopics.topics,
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
              eventData: { error },
            }),
          );
          throw error;
        }
      },
    };
  };