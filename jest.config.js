/** Jest config — ts-jest + jsdom, with the app's `@/` path alias mapped. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.(ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss)$': '<rootDir>/jest/styleMock.js',
  },
};
