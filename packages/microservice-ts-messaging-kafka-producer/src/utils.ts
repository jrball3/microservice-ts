import { Producer } from 'kafkajs';
import { KafkaProducer, KafkaProducerConfig } from './kafka';
import { messaging, observability } from '@jrball3/microservice-ts';

  /**
 * Creates a Kafka producer from a KafkaJS producer
 * @param dependencies - The event producer dependencies
 * @param config - The Kafka producer configuration
 * @param producer - The Kafka producer
 * @returns A Kafka producer
 */
export const fromProducer = (dependencies: messaging.producer.EventProducerDependencies) =>
  (config: KafkaProducerConfig, producer: Producer): KafkaProducer => {
    const { observabilityService } = dependencies;
    let isConnected = false;
    let isRunning = false;
    producer.on('producer.connect', () => {
      isConnected = true;
      isRunning = true;
    });
    producer.on('producer.disconnect', () => {
      isConnected = false;
      isRunning = false;
    });
    return {
      producer,
      connect: async (): Promise<boolean> => {
        try {
          await producer.connect();
          isConnected = true;
          isRunning = true;
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.producer.connect.success',
              eventScope: 'kafka.producer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventTimestamp: new Date(),
              eventData: {
                clientId: config.kafka.clientId,
              },
            }),
          );
          return true;
        } catch (error) {
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.producer.connect.error',
              eventScope: 'kafka.producer',
              eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
              eventTimestamp: new Date(),
              eventData: {
                clientId: config.kafka.clientId,
                error: error,
              },
            }),
          );
          throw error;
        }
      },
      disconnect: async (): Promise<boolean> => {
        await producer.disconnect();
        isConnected = false;
        isRunning = false;
        observabilityService.emit(
          observability.event({
            eventType: observability.EventType.NOOP,
            eventName: 'kafka.producer.disconnect.success',
            eventScope: 'kafka.producer',
            eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
            eventTimestamp: new Date(),
            eventData: {
              clientId: config.kafka.clientId,
            },
          }),
        );
        return true;
      },
      isConnected: (): boolean => isConnected,
      isRunning: (): boolean => isRunning,
      send: async (
        topic: string,
        message: Buffer | string,
        options?: messaging.producer.ProducerOptions,
      ): Promise<messaging.producer.ProducerResult> => {
        const key = options?.key;
        const value = message;
        try {
          const result = await producer.send({
            topic,
            messages: [{ key, value }],
            acks: options?.acks,
            timeout: options?.timeout,
          });
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.producer.send.success',
              eventScope: 'kafka.producer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.kafka.clientId,
                topic,
                key,
                value,
                acks: options?.acks,
                timeout: options?.timeout,
              },
            }),
          );
          return {
            success: result[0]?.errorCode === 0,
            ...result[0],
          };
        } catch (error) {
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.producer.send.error',
              eventScope: 'kafka.producer',
              eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
              eventTimestamp: new Date(),
              eventData: {
                clientId: config.kafka.clientId,
                error: error,
              },
            }),
          );
          throw error;
        }
      },
      sendBatch: async (
        topic: string,
        messages: (string | Buffer)[],
        options?: messaging.producer.ProducerOptions,
      ): Promise<messaging.producer.ProducerResult[]> => {
        const key = options?.key;
        try {
          const result = await producer.send({
            topic,
            messages: messages.map((value) => ({ key, value })),
            acks: options?.acks,
            timeout: options?.timeout,
          });
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.producer.sendBatch.success',
              eventScope: 'kafka.producer',
              eventSeverity: observability.eventSeverity.EventSeverity.DEBUG,
              eventData: {
                clientId: config.kafka.clientId,
                topic,
                key,
                messages,
                acks: options?.acks,
                timeout: options?.timeout,
              },
            }),
          );
          return result.map((r) => ({
            success: r.errorCode === 0,
            ...r,
          }));
        } catch (error) {
          observabilityService.emit(
            observability.event({
              eventType: observability.EventType.NOOP,
              eventName: 'kafka.producer.sendBatch.error',
              eventScope: 'kafka.producer',
              eventSeverity: observability.eventSeverity.EventSeverity.ERROR,
              eventTimestamp: new Date(),
              eventData: {
                clientId: config.kafka.clientId,
                error: error,
              },
            }),
          );
          throw error;
        }
      },
    };
  };
