const { test, expect } = require('@playwright/test');

test.describe('Flashcards App - Home Page', () => {
  test('should load home page with Flashcards title', async ({ page }) => {
    await page.goto('/');

    // Check main heading
    await expect(page.locator('h1')).toContainText('Flashcards');

    // Check instruction text
    await expect(page.getByText('Select a category:')).toBeVisible();
  });

  test('should load and display categories from manifest', async ({ page }) => {
    await page.goto('/');

    // Wait for category buttons to load
    await page.waitForSelector('.category-button', { timeout: 5000 });

    // Check that at least one category is loaded
    const categoryButtons = page.locator('.category-button');
    const count = await categoryButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display category with icon and deck count', async ({ page }) => {
    await page.goto('/');

    // Wait for categories to load
    await page.waitForSelector('.category-button', { timeout: 5000 });

    // Check first category has icon and info
    const firstCategory = page.locator('.category-button').first();
    await expect(firstCategory.locator('.category-icon')).toBeVisible();
    await expect(firstCategory.locator('.category-name')).toBeVisible();
    await expect(firstCategory.locator('.category-count')).toBeVisible();
  });
});

test.describe('Flashcards App - Category Navigation', () => {
  test('should navigate to category page when clicking a category', async ({ page }) => {
    await page.goto('/');

    // Wait for categories to load
    await page.waitForSelector('.category-button', { timeout: 5000 });

    // Click the first category
    const firstButton = page.locator('.category-button').first();
    await firstButton.click();

    // Verify we're on the category page
    await expect(page).toHaveURL(/\/category\/.+/);

    // Verify category page elements
    await expect(page.locator('.back-button')).toBeVisible();
    await expect(page.locator('.back-button')).toContainText('← Home');
  });

  test('should display decks in category page', async ({ page }) => {
    await page.goto('/');

    // Navigate to first category
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();

    // Wait for deck buttons to load
    await page.waitForSelector('.deck-button', { timeout: 5000 });

    // Check that at least one deck is loaded
    const deckButtons = page.locator('.deck-button');
    const count = await deckButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to study page from category page', async ({ page }) => {
    await page.goto('/');

    // Navigate to category
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();

    // Wait for decks to load
    await page.waitForSelector('.deck-button', { timeout: 5000 });

    // Click the first deck
    const firstDeck = page.locator('.deck-button').first();
    await firstDeck.click();

    // Verify we're on the study page with a filename parameter
    await expect(page).toHaveURL(/\/study\/.+\.csv/);
  });

  test('should navigate back to home from category page via back button', async ({ page }) => {
    await page.goto('/');

    // Navigate to category
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();

    // Wait for back button
    await page.waitForSelector('.back-button');

    // Click back button
    await page.locator('.back-button').click();

    // Verify we're back on home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Flashcards');
  });

  test('should handle invalid category gracefully', async ({ page }) => {
    // Navigate directly to invalid category
    await page.goto('/category/nonexistent');

    // Should show error message
    await expect(page.locator('.error')).toBeVisible();
    await expect(page.locator('.error')).toContainText('not found');
  });
});

test.describe('Flashcards App - Study Page', () => {
  test('should display flashcard and flip on click', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

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

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

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

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for check button
    await page.waitForSelector('.check-button');

    // Get initial progress
    const initialProgress = await page.locator('.progress').textContent();

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

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

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

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

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

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

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

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for test button
    await page.waitForSelector('.test-button');

    // Click test button
    await page.locator('.test-button').click();

    // Wait for mode change
    await page.waitForTimeout(400);

    // Verify Complete Test button appears (indicates test mode)
    await expect(page.locator('.complete-button')).toBeVisible();
  });

  test('should navigate back to category page from study page', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    const firstCategory = page.locator('.category-button').first();

    // Get category name for verification
    const categoryName = await firstCategory.locator('.category-name').textContent();

    await firstCategory.click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for study page to load
    await expect(page).toHaveURL(/\/study/);

    // Verify back button shows category name
    const backButton = page.locator('.back-button');
    await expect(backButton).toContainText(categoryName);

    // Click back button
    await backButton.click();

    // Verify we're back on category page
    await expect(page).toHaveURL(/\/category\/.+/);
    await expect(page.locator('h1')).toContainText(categoryName);
  });

  test('should go to previous card when clicking Previous button', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

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
