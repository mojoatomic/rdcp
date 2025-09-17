/**
 * @fileoverview Jest configuration for RDCP SDK
 * Following WARP requirements for testing setup
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.(js|ts)', '**/?(*.)+(spec|test).(js|ts)'],
  transform: {
    '^.+\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.(js|ts)',
    '!src/**/*.d.ts',
    '!src/**/index.(js|ts)'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
  preset: 'ts-jest'
}
