import { http } from '../../../src';
import os from 'os';
import { v1 as uuidv1 } from 'uuid';

jest.mock('os', () => ({
  hostname: jest.fn(),
}));

jest.mock('uuid', () => ({
  v1: jest.fn(),
}));

describe('Request ID Generator', () => {
  const mockHostname = 'testhost';
  const mockUuid = '00112233-4455-6677-8899-aabbccddeeff';
  const originalPid = process.pid;

  beforeAll(() => {
    (os.hostname as jest.Mock).mockReturnValue(mockHostname);
    (uuidv1 as jest.Mock).mockReturnValue(mockUuid);
    Object.defineProperty(process, 'pid', {
      value: 12345,
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
    Object.defineProperty(process, 'pid', {
      value: originalPid,
    });
  });

  it('should generate a request ID in the correct format', () => {
    const requestId = http.utils.requestId.generate();
    expect(requestId).toBe('00112233-testhost-12345-aabbccddeeff');
  });

  it('should use the first 8 characters of hostname', () => {
    (os.hostname as jest.Mock).mockReturnValue('longhostname');
    const requestId = http.utils.requestId.generate();
    expect(requestId.split('-')[1]).toBe('longhost');
  });

  it('should pad short hostnames with zeros', () => {
    (os.hostname as jest.Mock).mockReturnValue('short');
    const requestId = http.utils.requestId.generate();
    expect(requestId.split('-')[1]).toBe('short000');
  });

  it('should include the process ID', () => {
    const requestId = http.utils.requestId.generate();
    expect(requestId.split('-')[2]).toBe('12345');
  });

  it('should use the first 8 characters of UUID for timestamp', () => {
    const requestId = http.utils.requestId.generate();
    expect(requestId.split('-')[0]).toBe('00112233');
  });

  it('should use the last 12 characters of UUID for uuid_low', () => {
    const requestId = http.utils.requestId.generate();
    expect(requestId.split('-')[3]).toBe('aabbccddeeff');
  });
});
