module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.(ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss)$': '<rootDir>/jest/styleMock.js',
    '^react-markdown$': '<rootDir>/jest/reactMarkdownMock.js',
    '^remark-gfm$': '<rootDir>/jest/remarkGfmMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
};
