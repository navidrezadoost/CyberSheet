module.exports = {
  // Run tests in parallel across workspaces
  projects: [
    '<rootDir>/packages/core/jest.config.cjs',
    '<rootDir>/packages/renderer-canvas/jest.config.cjs',
    '<rootDir>/packages/io-xlsx/jest.config.cjs'
  ],
  testTimeout: 20000,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
};
