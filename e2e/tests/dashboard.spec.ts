import { expect, test } from '@playwright/test';
import { triggerPing } from '../support/api';

test.describe('monitoring dashboard', () => {
  test('shows history on load and adds new pings live without a reload', async ({
    page,
    request,
  }) => {
    const existing = await triggerPing(request);

    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText('Live');
    await expect(page.locator(`[data-ping-id="${existing.id}"]`)).toBeVisible();

    // Mark the document: if the page reloaded, the marker would disappear.
    await page.evaluate(() => {
      document.body.dataset.e2eMarker = 'still-here';
    });

    const live = await triggerPing(request);

    await expect(page.locator(`[data-ping-id="${live.id}"]`)).toBeVisible();
    await expect(page.getByTestId('ping-row').first()).toHaveAttribute(
      'data-ping-id',
      String(live.id),
    );
    await expect(page.locator('body')).toHaveAttribute('data-e2e-marker', 'still-here');
  });

  test('opens the full request and response for a ping', async ({ page, request }) => {
    const ping = await triggerPing(request);

    await page.goto('/');
    await page.locator(`[data-ping-id="${ping.id}"]`).getByRole('button').click();

    const dialog = page.getByRole('dialog', { name: `Ping #${ping.id}` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Request payload' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Response body' })).toBeVisible();
    await expect(dialog.getByText('"requestId"').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('adapts the table to the viewport without horizontal page scroll', async ({
    page,
    request,
    isMobile,
  }) => {
    await triggerPing(request);
    await page.goto('/');
    await expect(page.getByTestId('ping-row').first()).toBeVisible();

    const sizeHeader = page.getByRole('columnheader', { name: 'Size' });
    if (isMobile) await expect(sizeHeader).toBeHidden();
    else await expect(sizeHeader).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
