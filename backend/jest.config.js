/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/services/**/*.ts',
    'src/middleware/**/*.ts',
  ],
  coverageThreshold: {
    global: { branches: 55, functions: 60, lines: 65, statements: 65 },
  },
  testTimeout: 30000,
  verbose: false,
  clearMocks: true,
};
