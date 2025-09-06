import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown for E2E tests...');

  try {
    // Perform cleanup tasks
    console.log('Cleaning up test artifacts...');

    // Add any specific cleanup logic here
    // For example: clearing test databases, stopping services, etc.

    console.log('Global teardown completed successfully');

  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw here as it might mask test failures
  }
}

export default globalTeardown;