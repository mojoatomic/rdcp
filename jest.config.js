/**
 * @fileoverview Jest configuration for RDCP SDK
 * Following WARP requirements for testing setup with ES modules support
 * Context7 Compliance: Uses ts-jest ESM patterns
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.(js|ts)', '**/?(*.)+(spec|test).(js|ts)'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    'node-fetch': '<rootDir>/node_modules/node-fetch/src/index.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
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
  preset: 'ts-jest/presets/default-esm',
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob|formdata-polyfill|web-streams-polyfill)/)',
  ]
}
