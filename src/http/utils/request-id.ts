import os from 'os';
import { v1 as uuidv1 } from 'uuid';

const HOSTNAME: string = os.hostname().slice(0, 8).padEnd(8, '0');
const PID: string = process.pid.toString();

/**
 * Generate a request ID in the format: timestamp-hostname-pid-uuid_low
 * Factors in hostname, pid, and uses timestamp from uuidv1 to make it sortable
 * @returns A request ID
 */
export const generate = (): string => {
  // Format: timestamp-hostname-pid-uuid_low
  const uuid = uuidv1();
  const timestamp = uuid.slice(0, 8);
  const uuidLow = uuid.slice(24);
  return `${timestamp}-${HOSTNAME}-${PID}-${uuidLow}`;
};
