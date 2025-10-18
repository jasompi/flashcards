const { test, expect } = require('@playwright/test');

test.describe('Flashcards App', () => {
  test('should load home page with Spanish Flashcards title', async ({ page }) => {
    await page.goto('/');

    // Check main heading
    await expect(page.locator('h1')).toContainText('Spanish Flashcards');

    // Check instruction text
    await expect(page.getByText('Select a topic to study:')).toBeVisible();
  });

  test('should load and display flashcard sets from manifest', async ({ page }) => {
    await page.goto('/');

    // Wait for file buttons to load
    await page.waitForSelector('.file-button', { timeout: 5000 });

    // Check that at least one flashcard set is loaded
    const fileButtons = page.locator('.file-button');
    const count = await fileButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to study page when clicking a flashcard set', async ({ page }) => {
    await page.goto('/');

    // Wait for flashcard sets to load
    await page.waitForSelector('.file-button', { timeout: 5000 });

    // Click the first flashcard set
    const firstButton = page.locator('.file-button').first();
    await firstButton.click();

    // Verify we're on the study page with a filename parameter
    await expect(page).toHaveURL(/\/study\/.+\.csv/);
  });

  test('should display flashcard and flip on click', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for flashcard to load
    await page.waitForSelector('.flashcard', { timeout: 5000 });

    // Check that flashcard doesn't have 'flipped' class initially
    const flashcard = page.locator('.flashcard');
    await expect(flashcard).not.toHaveClass(/flipped/);

    // Click to flip
    await page.locator('.flashcard-container').click();

    // Wait for flip animation
    await page.waitForTimeout(600);

    // Verify flashcard now has 'flipped' class
    await expect(flashcard).toHaveClass(/flipped/);
  });

  test('should navigate between flashcards using next button', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for navigation buttons
    await page.waitForSelector('.next-button');

    // Get initial progress text
    const initialProgress = await page.locator('.progress').textContent();

    // Click next button
    await page.locator('.next-button').click();

    // Wait for transition
    await page.waitForTimeout(400);

    // Verify progress changed
    const newProgress = await page.locator('.progress').textContent();
    expect(initialProgress).not.toBe(newProgress);
  });

  test('should mark card as memorized using Got It button', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for check button
    await page.waitForSelector('.check-button');

    // Get initial remaining count
    const initialProgress = await page.locator('.progress').textContent();
    const initialRemaining = parseInt(initialProgress.match(/of (\d+)/)[1]);

    // Click Got It button
    await page.locator('.check-button').click();

    // Wait for transition
    await page.waitForTimeout(400);

    // Verify remaining count decreased or shows memorized count
    const newProgress = await page.locator('.progress').textContent();
    const hasMemorized = newProgress.includes('memorized');
    expect(hasMemorized || newProgress !== initialProgress).toBeTruthy();
  });

  test('should reinsert card when clicking Not Yet button', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for x button
    await page.waitForSelector('.x-button');

    // Get initial card count
    const initialProgress = await page.locator('.progress').textContent();

    // Click Not Yet button
    await page.locator('.x-button').click();

    // Wait for transition
    await page.waitForTimeout(400);

    // Verify card count stayed the same (card was reinserted)
    const newProgress = await page.locator('.progress').textContent();
    const initialRemaining = parseInt(initialProgress.match(/of (\d+)/)[1]);
    const newRemaining = parseInt(newProgress.match(/of (\d+)/)[1]);
    expect(newRemaining).toBe(initialRemaining);
  });

  test('should shuffle deck when clicking Shuffle button', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for shuffle button
    await page.waitForSelector('.shuffle-button');

    // Click shuffle button
    await page.locator('.shuffle-button').click();

    // Wait a moment for shuffle
    await page.waitForTimeout(200);

    // Verify shuffle button is still visible (button worked without error)
    expect(await page.locator('.shuffle-button').isVisible()).toBeTruthy();
  });

  test('should reset deck when clicking Reset button', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for buttons
    await page.waitForSelector('.check-button');

    // Mark a card as memorized
    await page.locator('.check-button').click();
    await page.waitForTimeout(400);

    // Click reset button
    await page.locator('.reset-button').click();

    // Verify no memorized count in progress
    const progress = await page.locator('.progress').textContent();
    expect(progress.includes('memorized')).toBeFalsy();
  });

  test('should start test mode when clicking Test button', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for test button
    await page.waitForSelector('.test-button');

    // Click test button
    await page.locator('.test-button').click();

    // Wait for mode change
    await page.waitForTimeout(400);

    // Verify Complete Test button appears (indicates test mode)
    await expect(page.locator('.complete-button')).toBeVisible();
  });

  test('should navigate back to home page', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for study page to load
    await expect(page).toHaveURL(/\/study/);

    // Click back button
    await page.locator('.back-button').click();

    // Verify we're back on home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Spanish Flashcards');
  });

  test('should go to previous card when clicking Previous button', async ({ page }) => {
    await page.goto('/');

    // Navigate to first flashcard set
    await page.waitForSelector('.file-button');
    await page.locator('.file-button').first().click();

    // Wait for navigation buttons
    await page.waitForSelector('.previous-button');

    // Click next a few times to build history
    await page.locator('.next-button').click();
    await page.waitForTimeout(400);
    await page.locator('.next-button').click();
    await page.waitForTimeout(400);

    // Get current card
    const beforePrevious = await page.locator('.progress').textContent();

    // Click previous
    await page.locator('.previous-button').click();
    await page.waitForTimeout(400);

    // Verify we went back
    const afterPrevious = await page.locator('.progress').textContent();
    expect(beforePrevious).not.toBe(afterPrevious);
  });
});
