module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'jsx', 'mts', 'cts', 'json', 'node'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  moduleNameMapper: {
    '^@cyber-sheet/core/sdk$': '<rootDir>/../core/src/sdk/index.ts',
    '^@cyber-sheet/core$': '<rootDir>/../core/src',
    '^@cyber-sheet/renderer-canvas$': '<rootDir>/../renderer-canvas/src',
    '^@cyber-sheet/io-xlsx
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      diagnostics: true,
    },
  },
};
: '<rootDir>/../io-xlsx/src',
    '^@cyber-sheet/cf-ui-core
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      diagnostics: true,
    },
  },
};
: '<rootDir>/../cf-ui-core/src',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      diagnostics: true,
    },
  },
};
