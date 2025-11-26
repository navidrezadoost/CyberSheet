module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleNameMapper: {
    '^@cyber-sheet/core(.*)$': '<rootDir>/../core/src$1',
    '^@cyber-sheet/renderer-canvas(.*)$': '<rootDir>/../renderer-canvas/src$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      diagnostics: true,
    },
  },
};
