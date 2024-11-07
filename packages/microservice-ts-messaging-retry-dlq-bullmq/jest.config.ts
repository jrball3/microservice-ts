export default {
  displayName: 'microservice-ts-messaging-retry-dlq-bullmq',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/microservice-ts-messaging-retry-dlq-bullmq'
};
