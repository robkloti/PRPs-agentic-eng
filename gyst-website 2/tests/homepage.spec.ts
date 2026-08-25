import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GYST/);
  });

  test('should display hero section', async ({ page }) => {
    await page.goto('/');

    // Check for main headline
    await expect(page.getByRole('heading', { name: /Compound your AI investment/i })).toBeVisible();

    // Check for CTA buttons
    await expect(page.getByRole('button', { name: /Get Started Free/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /View Live Demos/i })).toBeVisible();
  });

  test('should display services section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Our Services/i })).toBeVisible();
    await expect(page.getByText(/RAG Systems/i)).toBeVisible();
    await expect(page.getByText(/Voice AI Agents/i)).toBeVisible();
    await expect(page.getByText(/Automation Workflows/i)).toBeVisible();
    await expect(page.getByText(/Multi-Agent Systems/i)).toBeVisible();
  });

  test('should display tech stack section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Built with Industry-Leading Technology/i })).toBeVisible();
    await expect(page.getByText(/OpenAI/i)).toBeVisible();
    await expect(page.getByText(/Anthropic/i)).toBeVisible();
    await expect(page.getByText(/Retell AI/i)).toBeVisible();
  });

  test('should display case studies section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Real Results, Measurable Impact/i })).toBeVisible();
    await expect(page.getByText(/Primary Care Practice/i)).toBeVisible();
    await expect(page.getByText(/E-commerce Brand/i)).toBeVisible();
    await expect(page.getByText(/Financial Services Firm/i)).toBeVisible();
  });

  test('should display CTA section', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Ready to Get Your Stack Together/i })).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check hero is visible on mobile
    await expect(page.getByRole('heading', { name: /Compound your AI investment/i })).toBeVisible();
  });

  test('should have smooth scroll', async ({ page }) => {
    await page.goto('/');

    // Check that Lenis smooth scroll is initialized
    const html = await page.locator('html').getAttribute('class');
    await expect(html).toContain('lenis');
  });
});

test.describe('Animations', () => {
  test('should animate hero elements on load', async ({ page }) => {
    await page.goto('/');

    // Wait for animations to complete
    await page.waitForTimeout(1000);

    const heading = page.getByRole('heading', { name: /Compound your AI investment/i });
    await expect(heading).toBeVisible();
  });

  test('should trigger scroll animations', async ({ page }) => {
    await page.goto('/');

    // Scroll to services section
    await page.getByRole('heading', { name: /Our Services/i }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Check services are visible after scroll
    await expect(page.getByText(/RAG Systems/i)).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
