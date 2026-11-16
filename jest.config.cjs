module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-reanimated/jest/resolver',
  testMatch: ['<rootDir>/tests/ui/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/ui/setup.cjs'],
  cacheDirectory: '<rootDir>/.jest-cache',
};
