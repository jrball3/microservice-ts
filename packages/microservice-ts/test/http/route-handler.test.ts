import { http } from '../../src';

describe('Route Handler', () => {
  // Mock dependencies
  const mockDependencies: http.Dependencies = {
    observabilityService: {
      on: jest.fn(),
      emit: jest.fn(),
    },
  };

  // Mock request context
  const mockContext: http.RequestContext = {
    requestId: 'test-request-id',
    timestamp: new Date(),
    method: http.HttpMethod.GET,
    hostname: 'test-hostname',
    ip: '127.0.0.1',
    path: '/test',
    url: 'http://test.com/test',
    protocol: 'HTTP/1.1',
  };

  // Mock request
  const mockRequest: http.routeHandler.Request = {
    headers: {},
    body: {},
    params: { id: '123' },
    query: { filter: 'active' },
  };

  it('should create a route handler that parses the request and handles the parsed request', async () => {
    const mockParser = (_deps: http.Dependencies) => jest.fn((_ctx, _req) => Promise.resolve({
      parsedKey: 'parsedValue',
    }));
    const mockHandler = (_deps: http.Dependencies) => jest.fn((_ctx, _req) => Promise.resolve({
      statusCode: 200,
      data: { result: 'success' },
    }));

    const routeHandler = http.routeHandler.create(mockParser, mockHandler);

    const result = await routeHandler(mockDependencies)(mockContext, mockRequest);

    expect(mockParser(mockDependencies)).toHaveBeenCalledWith(mockContext, mockRequest);
    expect(mockHandler(mockDependencies)).toHaveBeenCalledWith(mockContext, { parsedKey: 'parsedValue' });
    expect(result).toEqual({
      statusCode: 200,
      data: { result: 'success' },
    });
  });

  it('should handle errors thrown by the parser', async () => {
    const mockParser = jest.fn().mockImplementation(() => {
      throw new Error('Parsing error');
    });

    const mockHandler = jest.fn();

    const routeHandler = http.routeHandler.create(mockParser, mockHandler);

    await expect(routeHandler(mockDependencies)(mockContext, mockRequest)).rejects.toThrow('Parsing error');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should handle errors thrown by the handler', async () => {
    const mockParser = jest.fn((_deps) => jest.fn((_ctx, _req) => Promise.resolve({
      parsedKey: 'parsedValue',
    })));
    const mockHandler = jest.fn((_deps) => jest.fn((_ctx, _req) => Promise.reject(new Error('Handling error'))));

    const routeHandler = http.routeHandler.create(mockParser, mockHandler);

    await expect(routeHandler(mockDependencies)(mockContext, mockRequest)).rejects.toThrow('Handling error');
  });

  it('should pass custom dependencies to parser and handler', async () => {
    interface CustomDependencies extends http.Dependencies {
      customService: { doSomething: () => void };
    }

    const customDependencies: CustomDependencies = {
      observabilityService: {
        on: jest.fn(),
        emit: jest.fn(),
      },
      customService: { doSomething: jest.fn() },
    };

    const mockParser = jest.fn((_deps) => jest.fn((_ctx, _req) => Promise.resolve({
      parsedKey: 'parsedValue',
    })));
    const mockHandler = jest.fn((_deps) => jest.fn((_ctx, _req) => Promise.resolve({
      statusCode: 200,
      data: { result: 'success' },
    })));

    const routeHandler = http.routeHandler.create<{ parsedKey: string }, CustomDependencies>(mockParser, mockHandler);

    await routeHandler(customDependencies)(mockContext, mockRequest);

    expect(mockParser).toHaveBeenCalledWith(customDependencies);
    expect(mockHandler).toHaveBeenCalledWith(customDependencies);
  });
});
