// Global test setup
const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';

// Suppress console logs during tests
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Increase timeout for async operations
jest.setTimeout(10000);

// Global teardown
afterAll(async () => {
  // Close all mongoose connections
  await mongoose.disconnect();
});
