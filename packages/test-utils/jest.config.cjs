/** @type {import('jest').Config} */
module.exports = {
  displayName: 'test-utils',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.tsx'
  ],
  moduleNameMapper: {
    '^@cyber-sheet/cf-ui-core$': '<rootDir>/../cf-ui-core/src/index.ts'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      }
    ]
  }
};
