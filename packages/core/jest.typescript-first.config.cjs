const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  resolver: '<rootDir>/test/typescript-first-resolver.cjs',
};
