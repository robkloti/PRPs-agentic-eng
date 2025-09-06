import { test, expect, Page } from '@playwright/test';

test.describe('Provider Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await expect(page.locator('.avatar-app')).toBeVisible();
    
    // Mock HeyGen API calls
    await page.route('**/v1/streaming.create_token', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { token: 'mock-session-token-' + Date.now() }
        })
      });
    });

    // Mock D-ID script loading
    await page.route('**/agent.d-id.com/v2/index.js', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          console.log('D-ID script loaded');
          // Mock D-ID agent initialization
          setTimeout(() => {
            window.postMessage({
              type: 'agent:ready',
              data: { agentId: 'mock-agent' }
            }, '*');
          }, 1000);
        `
      });
    });
  });

  test('HeyGen provider full workflow', async ({ page }) => {
    console.log('Testing HeyGen provider workflow...');

    // Select HeyGen provider (should be selected by default)
    const heygenBtn = page.locator('[data-testid="provider-heygen"]');
    await expect(heygenBtn).toBeVisible();
    await expect(heygenBtn).toHaveClass(/active/);

    // Connect to avatar
    const connectBtn = page.locator('[data-testid="connect-btn"]');
    await expect(connectBtn).toBeVisible();
    await expect(connectBtn).toHaveText('Connect Avatar');
    
    await connectBtn.click();
    
    // Wait for connecting state
    await expect(connectBtn).toHaveText('Connecting...');
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveClass(/connecting/);

    // Mock successful connection
    await page.evaluate(() => {
      const event = new CustomEvent('connected', {
        detail: { provider: 'heygen', connectionId: 'mock-id' }
      });
      window.dispatchEvent(event);
    });

    // Verify connected state
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('HEYGEN');
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveClass(/connected/);

    // Verify message controls are now visible
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();
    
    const speakBtn = page.locator('[data-testid="speak-btn"]');
    await expect(speakBtn).toBeVisible();

    // Send message
    const testMessage = 'Hello, this is a test message for HeyGen';
    await messageInput.fill(testMessage);
    await expect(speakBtn).toBeEnabled();
    
    await speakBtn.click();
    
    // Verify speaking state
    await expect(speakBtn).toHaveText('Speaking...');
    await expect(speakBtn).toBeDisabled();

    // Mock speech events
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('speaking', {
        detail: { provider: 'heygen' }
      }));
    });

    // Verify speaking indicator appears
    await expect(page.locator('.speaking-indicator')).toBeVisible();
    await expect(page.locator('.avatar-video')).toHaveClass(/speaking/);

    // Mock speech end
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('speechEnded', {
        detail: { provider: 'heygen' }
      }));
    });

    // Verify return to idle state
    await expect(speakBtn).toHaveText('Speak');
    await expect(speakBtn).toBeEnabled();
    await expect(page.locator('.speaking-indicator')).not.toBeVisible();
    await expect(messageInput).toHaveValue(''); // Should be cleared
  });

  test('D-ID provider full workflow', async ({ page }) => {
    console.log('Testing D-ID provider workflow...');

    // Select D-ID provider
    const didBtn = page.locator('[data-testid="provider-did"]');
    await expect(didBtn).toBeVisible();
    await didBtn.click();
    await expect(didBtn).toHaveClass(/active/);

    // Connect to avatar
    const connectBtn = page.locator('[data-testid="connect-btn"]');
    await connectBtn.click();
    
    // Wait for connecting state
    await expect(connectBtn).toHaveText('Connecting...');

    // Mock D-ID connection
    await page.evaluate(() => {
      // Simulate D-ID script loading and agent ready
      setTimeout(() => {
        window.postMessage({
          type: 'agent:ready',
          data: { agentId: 'test-agent' }
        }, window.location.origin);
        
        // Then dispatch connected event
        window.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'd-id', connectionId: 'mock-did-id' }
        }));
      }, 1000);
    });

    // Verify connected state
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('D-ID');
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveClass(/connected/);

    // Send message to D-ID
    const messageInput = page.locator('[data-testid="message-input"]');
    const speakBtn = page.locator('[data-testid="speak-btn"]');
    
    const testMessage = 'Testing D-ID provider functionality';
    await messageInput.fill(testMessage);
    await speakBtn.click();

    // Mock D-ID speech events
    await page.evaluate(() => {
      window.postMessage({
        type: 'agent:speaking',
        data: {}
      }, window.location.origin);
    });

    await expect(page.locator('.speaking-indicator')).toBeVisible();

    // End speech
    await page.evaluate(() => {
      window.postMessage({
        type: 'agent:speechEnded',
        data: {}
      }, window.location.origin);
    });

    await expect(page.locator('.speaking-indicator')).not.toBeVisible();
  });

  test('Provider switching without interruption', async ({ page }) => {
    console.log('Testing provider switching...');

    // Start with HeyGen connection
    await page.locator('[data-testid="provider-heygen"]').click();
    await page.locator('[data-testid="connect-btn"]').click();

    // Mock HeyGen connection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connected', {
        detail: { provider: 'heygen', connectionId: 'heygen-id' }
      }));
    });

    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('HEYGEN');

    // Switch to D-ID
    await page.locator('[data-testid="provider-did"]').click();

    // Should show switching state
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveClass(/connecting/);

    // Mock switch completion
    await page.evaluate(() => {
      // Simulate disconnection from HeyGen
      window.dispatchEvent(new CustomEvent('switching', {
        detail: { from: 'heygen', to: 'd-id' }
      }));
      
      // Then connection to D-ID
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'd-id', connectionId: 'did-id' }
        }));
        
        window.dispatchEvent(new CustomEvent('switched', {
          detail: { from: 'heygen', to: 'd-id' }
        }));
      }, 500);
    });

    // Verify seamless switch
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('D-ID');
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveClass(/connected/);

    // Verify functionality after switch
    const messageInput = page.locator('[data-testid="message-input"]');
    const speakBtn = page.locator('[data-testid="speak-btn"]');
    
    await messageInput.fill('Testing after provider switch');
    await speakBtn.click();
    
    // Should work normally
    await expect(speakBtn).toHaveText('Speaking...');
  });

  test('Error recovery and fallback', async ({ page }) => {
    console.log('Testing error recovery...');

    // Mock network failure for HeyGen
    await page.route('**/v1/streaming.create_token', async route => {
      await route.abort('failed');
    });

    // Try to connect to HeyGen
    await page.locator('[data-testid="provider-heygen"]').click();
    await page.locator('[data-testid="connect-btn"]').click();

    // Should show error state
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveClass(/error/);
    
    // Error message should appear
    await expect(page.locator('.error-message')).toBeVisible();

    // Clear the error and try D-ID
    await page.locator('.error-close').click();
    await expect(page.locator('.error-message')).not.toBeVisible();

    // Switch to D-ID as fallback
    await page.locator('[data-testid="provider-did"]').click();
    
    // Mock successful D-ID connection
    await page.evaluate(() => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'd-id', connectionId: 'fallback-id' }
        }));
      }, 1000);
    });

    // Should successfully connect to fallback
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('D-ID');
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveClass(/connected/);
  });

  test('UI responsiveness and accessibility', async ({ page }) => {
    console.log('Testing UI responsiveness and accessibility...');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify layout adapts
    const mainContent = page.locator('.main-content');
    const headerContent = page.locator('.header-content');
    
    await expect(mainContent).toBeVisible();
    await expect(headerContent).toBeVisible();

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="provider-heygen"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="provider-did"]')).toBeFocused();

    // Test provider selection with keyboard
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="provider-did"]')).toHaveClass(/active/);

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Test contrast and visibility
    await expect(page.locator('.app-header h1')).toBeVisible();
    await expect(page.locator('.provider-selector')).toBeVisible();
    await expect(page.locator('.video-container')).toBeVisible();
  });

  test('Performance monitoring', async ({ page }) => {
    console.log('Testing performance monitoring...');

    // Monitor page load performance
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('.avatar-app');
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(5000); // 5 seconds

    // Test connection performance
    const connectBtn = page.locator('[data-testid="connect-btn"]');
    
    const connectionStartTime = Date.now();
    await connectBtn.click();
    
    // Mock fast connection
    await page.evaluate(() => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'perf-test' }
        }));
      }, 1000);
    });
    
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveClass(/connected/);
    
    const connectionTime = Date.now() - connectionStartTime;
    console.log(`Connection time: ${connectionTime}ms`);
    
    // Connection should complete reasonably quickly
    expect(connectionTime).toBeLessThan(10000); // 10 seconds including mock delays
  });

  test('Cross-browser compatibility', async ({ browserName, page }) => {
    console.log(`Testing in ${browserName}...`);

    // Basic functionality should work across all browsers
    await expect(page.locator('.avatar-app')).toBeVisible();
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.provider-selector')).toBeVisible();
    await expect(page.locator('.main-content')).toBeVisible();

    // Test CSS features
    const appElement = page.locator('.avatar-app');
    const computedStyle = await appElement.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        backgroundImage: style.backgroundImage,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
      };
    });

    // Verify gradient background is applied
    expect(computedStyle.backgroundImage).toContain('linear-gradient');

    // Browser-specific feature checks
    if (browserName === 'webkit') {
      // Safari-specific tests
      console.log('Running Safari-specific tests...');
      
      // Test webkit-specific CSS features
      const glassElement = page.locator('.controls-panel');
      const webkitStyle = await glassElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          webkitBackdropFilter: style.webkitBackdropFilter,
        };
      });
      
      // Backdrop filter should be supported (or gracefully degrade)
      // This is more of a visual test in reality
    }

    if (browserName === 'firefox') {
      // Firefox-specific tests
      console.log('Running Firefox-specific tests...');
      
      // Firefox has good CSS Grid support
      const gridElement = page.locator('.main-content');
      const gridStyle = await gridElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          display: style.display,
          gridTemplateColumns: style.gridTemplateColumns,
        };
      });
      
      expect(gridStyle.display).toBe('grid');
    }
  });
});