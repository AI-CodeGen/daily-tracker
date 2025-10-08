export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['js','mjs','cjs','json'],
  transform: {},
  verbose: false,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs'],
};