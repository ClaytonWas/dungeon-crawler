const { test, expect } = require('@playwright/test');

// Simple smoke test to ensure the profile/login app is up
test('profile login page loads', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await expect(page).toHaveTitle(/Dungeon Crawler - Login/i);
});

// Happy path: register -> login -> go to game client -> create party -> see Start Dungeon enabled
test('can register, login, open game, and create a party', async ({ page }) => {
  const unique = Date.now();
  const username = `testuser_${unique}`;
  const password = 'TestPass123!';

  // Go to register page
  await page.goto('http://localhost:3000/register');

  // Fill and submit registration form
  await page.getByLabel(/Username/i).fill(username);
  await page.getByLabel(/Password/i).fill(password);
  await page.getByLabel(/Confirm Password/i).fill(password);
  await page.getByRole('button', { name: /Register/i }).click();

  // After successful register, we should land on /home
  await page.waitForURL('**/home');

  // From home, open the game client via the "⚔️ Enter Game" button
  const playButton = await page.getByRole('button', { name: /Enter Game/i });
  await playButton.click();

  // New tab/window with game client at 5173
  const [gamePage] = await Promise.all([
    page.context().waitForEvent('page'),
  ]);

  await gamePage.waitForLoadState('domcontentloaded');

  // Ensure we are on game client
  await expect(gamePage).toHaveTitle(/Dungeon Crawler/i);

  // Open Social tab
  await gamePage.getByRole('button', { name: 'Social' }).click();

  // Click "Create Party"
  await gamePage.getByRole('button', { name: /Create Party/i }).click();

  // Wait for Start Dungeon button to appear and be enabled
  const startButton = await gamePage.getByRole('button', { name: /Start Dungeon/i });
  await expect(startButton).toBeEnabled();
});
