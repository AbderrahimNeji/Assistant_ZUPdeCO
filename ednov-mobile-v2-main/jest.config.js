/** Minimal config for pure-TS unit tests (utils). Maps the `@/` path alias from tsconfig. */
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['<rootDir>/utils/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
