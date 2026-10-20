module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  moduleNameMapper: {
    '^@cyber-sheet/core$': '<rootDir>/../core/src',
    '^@cyber-sheet/renderer-canvas$': '<rootDir>/../renderer-canvas/src',
    '^@cyber-sheet/io-xlsx$': '<rootDir>/../io-xlsx/src',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      diagnostics: true,
    },
  },
};
