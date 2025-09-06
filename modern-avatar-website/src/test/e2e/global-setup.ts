import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup for E2E tests...');

  // Start browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the dev server to be ready
    const baseURL = config.webServer?.url || 'http://localhost:3000';
    console.log(`Waiting for server at ${baseURL}...`);
    
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      try {
        const response = await page.goto(baseURL, { timeout: 5000 });
        if (response && response.ok()) {
          console.log('Server is ready!');
          break;
        }
      } catch (error) {
        retries++;
        console.log(`Server not ready, retrying... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (retries >= maxRetries) {
      throw new Error('Server failed to start within expected time');
    }

    // Perform any additional setup tasks
    console.log('Performing additional setup tasks...');

    // Check if the page loads correctly
    await page.waitForSelector('.avatar-app', { timeout: 10000 });
    console.log('Avatar app loaded successfully');

    // Verify critical elements are present
    await page.waitForSelector('.app-header', { timeout: 5000 });
    await page.waitForSelector('.provider-selector', { timeout: 5000 });
    await page.waitForSelector('.main-content', { timeout: 5000 });

    console.log('Global setup completed successfully');

  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;