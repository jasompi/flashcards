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

    // Wait for celebration animation and transition (800ms animation + 300ms fade + buffer)
    await page.waitForTimeout(1200);

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

    // Wait for sad animation and transition (800ms animation + 300ms fade + buffer)
    await page.waitForTimeout(1200);

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

    // Wait for reset transition to complete
    await page.waitForTimeout(400);

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

test.describe('Flashcards App - Spell Mode', () => {
  test('should toggle Spell Mode on and off', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for settings panel to load
    await page.waitForSelector('.settings-panel', { timeout: 5000 });

    // Wait a bit for React to render
    await page.waitForTimeout(500);

    // Find Spell Mode toggle switch (not the hidden checkbox, but the visible toggle)
    const toggleSwitches = page.locator('.settings-panel .toggle-switch');
    const spellModeToggle = toggleSwitches.nth(0); // First toggle is Spell Mode
    const spellModeCheckbox = spellModeToggle.locator('input[type="checkbox"]');

    // Verify it's initially unchecked
    await expect(spellModeCheckbox).not.toBeChecked();

    // Click the visible toggle switch
    await spellModeToggle.click();
    await page.waitForTimeout(200);

    // Verify it's now checked
    await expect(spellModeCheckbox).toBeChecked();

    // Toggle Spell Mode off
    await spellModeToggle.click();
    await page.waitForTimeout(200);

    // Verify it's unchecked again
    await expect(spellModeCheckbox).not.toBeChecked();
  });

  test('should hide text when Spell Mode is enabled', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for flashcard
    await page.waitForSelector('.flashcard', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Get initial text visibility (should be visible)
    const cardContent = page.locator('.card-content').first();
    await page.waitForSelector('.card-content', { state: 'visible' });

    let opacity = await cardContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0);

    // Enable Spell Mode - click the toggle switch
    const toggleSwitches = page.locator('.settings-panel .toggle-switch');
    const spellModeToggle = toggleSwitches.nth(0);
    await spellModeToggle.click();

    // Wait for state update
    await page.waitForTimeout(300);

    // Text should now be hidden (opacity near 0)
    opacity = await cardContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.01); // Check it's effectively 0
  });

  test('should reveal text when clicking card in Spell Mode', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for flashcard
    await page.waitForSelector('.flashcard', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Enable Spell Mode - click the toggle switch
    const toggleSwitches = page.locator('.settings-panel .toggle-switch');
    const spellModeToggle = toggleSwitches.nth(0);
    await spellModeToggle.click();
    await page.waitForTimeout(300);

    // Verify text is hidden
    const cardContent = page.locator('.card-content').first();
    let opacity = await cardContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.01); // Check it's effectively 0

    // Click card to reveal text
    await page.locator('.flashcard-container').click();
    await page.waitForTimeout(300);

    // Text should now be visible
    opacity = await cardContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0);
  });

  test('should hide text again when navigating to next card in Spell Mode', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for flashcard
    await page.waitForSelector('.flashcard', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Enable Spell Mode - click the toggle switch
    const toggleSwitches = page.locator('.settings-panel .toggle-switch');
    const spellModeToggle = toggleSwitches.nth(0);
    await spellModeToggle.click();
    await page.waitForTimeout(300);

    // Reveal text on first card
    await page.locator('.flashcard-container').click();
    await page.waitForTimeout(300);

    // Navigate to next card
    await page.locator('.next-button').click();
    await page.waitForTimeout(500);

    // Text should be hidden again on new card
    const cardContent = page.locator('.card-content').first();
    const opacity = await cardContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.01); // Check it's effectively 0
  });

  test('should automatically enable auto-play when Spell Mode is on', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for settings panel
    await page.waitForSelector('.settings-panel', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Get toggle switches - spell mode is first, auto-play is second
    const toggleSwitches = page.locator('.settings-panel .toggle-switch');
    const spellModeToggle = toggleSwitches.nth(0);
    const autoPlayToggle = toggleSwitches.nth(1);
    const autoPlayCheckbox = autoPlayToggle.locator('input[type="checkbox"]');

    // Verify auto-play is initially off
    await expect(autoPlayCheckbox).not.toBeChecked();

    // Enable Spell Mode
    await spellModeToggle.click();
    await page.waitForTimeout(200);

    // Auto-play checkbox should now be disabled (greyed out)
    await expect(autoPlayCheckbox).toBeDisabled();
  });

  test('should maintain consistent colors when switching Front/Back', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for flashcard
    await page.waitForSelector('.flashcard-front');

    // Get initial background color
    const flashcardFront = page.locator('.flashcard-front');
    const initialBg = await flashcardFront.evaluate(el => window.getComputedStyle(el).background);

    // Switch to Back using segmented control
    const backButton = page.locator('.segmented-control .segment').nth(1);
    await backButton.click();
    await page.waitForTimeout(400);

    // Get new background color
    const newBg = await flashcardFront.evaluate(el => window.getComputedStyle(el).background);

    // Colors should be different (switched)
    expect(initialBg).not.toBe(newBg);

    // Switch back to Front
    const frontButton = page.locator('.segmented-control .segment').nth(0);
    await frontButton.click();
    await page.waitForTimeout(400);

    // Should return to original color
    const finalBg = await flashcardFront.evaluate(el => window.getComputedStyle(el).background);
    expect(finalBg).toBe(initialBg);
  });
});

test.describe('Flashcards App - Completion and Test Screens', () => {
  test('should complete all cards and show congratulations', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Wait for check button
    await page.waitForSelector('.check-button');

    // Mark all cards as memorized (loop with max iterations to avoid infinite loop)
    let maxIterations = 50;
    while (maxIterations-- > 0) {
      // Break if we see completion message
      if (await page.locator('.completion-message').isVisible().catch(() => false)) {
        break;
      }

      // Check if check button still exists
      if (await page.locator('.check-button').isVisible().catch(() => false)) {
        await page.locator('.check-button').click();
        await page.waitForTimeout(1200); // Wait for animation and transition
      } else {
        break;
      }
    }

    // Verify completion message appears
    await expect(page.locator('.completion-message')).toBeVisible();
    await expect(page.locator('.completion-message')).toContainText('Congratulations');

    // Verify buttons are present
    await expect(page.locator('.completion-message').getByText('Start Over')).toBeVisible();
    await expect(page.locator('.completion-message').getByText('← Home')).toBeVisible();
  });

  test('should navigate home from congratulations screen', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Mark all cards as memorized
    await page.waitForSelector('.check-button');
    let maxIterations = 50;
    while (maxIterations-- > 0) {
      if (await page.locator('.completion-message').isVisible().catch(() => false)) {
        break;
      }
      if (await page.locator('.check-button').isVisible().catch(() => false)) {
        await page.locator('.check-button').click();
        await page.waitForTimeout(1200);
      } else {
        break;
      }
    }

    // Wait for completion screen to be fully rendered
    await page.waitForTimeout(500);

    // Click Home button
    await page.locator('.completion-message').getByText('← Home').click();

    // Verify we're back on home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Flashcards');
  });

  test('should complete test and show test results', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Start test mode
    await page.waitForSelector('.test-button');
    await page.locator('.test-button').click();
    await page.waitForTimeout(400);

    // Complete test by giving up on all cards (Got It is no longer available in
    // test mode; grading now happens exclusively via the typed-answer check)
    let maxIterations = 50;
    while (maxIterations-- > 0) {
      const completionVisible = await page.locator('.completion-message').isVisible().catch(() => false);
      if (completionVisible) {
        break;
      }

      const notYetButton = page.locator('.x-button');
      if (await notYetButton.isVisible().catch(() => false)) {
        await notYetButton.click();
        await page.waitForTimeout(1200);
      } else {
        break;
      }
    }

    // Verify test completion message
    await expect(page.locator('.completion-message')).toBeVisible();
    const completionText = await page.locator('.completion-message').textContent();
    expect(completionText).toMatch(/Test Complete!|Perfect Score!/);

    // Verify Home button is present
    await expect(page.locator('.test-controls').getByText('← Home')).toBeVisible();
  });

  test('should navigate home from test complete screen', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Start and complete test
    await page.waitForSelector('.test-button');
    await page.locator('.test-button').click();
    await page.waitForTimeout(400);

    // Give up on all cards to reach the completion screen
    let maxIterations = 50;
    while (maxIterations-- > 0) {
      if (await page.locator('.completion-message').isVisible().catch(() => false)) {
        break;
      }
      const notYetButton = page.locator('.x-button');
      if (await notYetButton.isVisible().catch(() => false)) {
        await notYetButton.click();
        await page.waitForTimeout(1200);
      } else {
        break;
      }
    }

    // Wait for completion screen to be fully stable
    await page.waitForTimeout(500);

    // Click Home button from test controls with force to avoid animation issues
    await page.locator('.test-controls').getByText('← Home').click({ force: true });

    // Verify we're back on home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Flashcards');
  });

  test('should hide settings panel during test mode', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Verify settings panel is visible initially
    await expect(page.locator('.settings-panel')).toBeVisible();

    // Start test mode
    await page.waitForSelector('.test-button');
    await page.locator('.test-button').click();
    await page.waitForTimeout(400);

    // Verify settings panel is now hidden
    await expect(page.locator('.settings-panel')).not.toBeVisible();
  });

  test('should reveal correct answer and mark failed when typed answer is wrong', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Start test mode
    await page.waitForSelector('.test-button');
    await page.locator('.test-button').click();
    await page.waitForTimeout(400);

    // Type an obviously-wrong answer and check it
    await page.waitForSelector('.answer-input');
    await page.locator('.answer-input').fill('zzz_not_a_real_answer_zzz');
    await page.locator('.answer-check .check-button').click();

    // Card should flip to reveal the correct answer before advancing
    await page.waitForTimeout(200);
    await expect(page.locator('.flashcard')).toHaveClass(/flipped/);

    // After the reveal window + sad effect + fade, it should advance
    await page.waitForTimeout(1500 + 800 + 400);
    await expect(page.locator('.flashcard')).not.toHaveClass(/flipped/);
  });

  test('should submit typed answer with Enter key', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();

    // Start test mode
    await page.waitForSelector('.test-button');
    await page.locator('.test-button').click();
    await page.waitForTimeout(400);

    // Press Enter after typing - should trigger the same check as clicking the button
    await page.waitForSelector('.answer-input');
    await page.locator('.answer-input').fill('zzz_not_a_real_answer_zzz');
    await page.locator('.answer-input').press('Enter');

    // Card should flip to reveal the correct answer, same as clicking the check button
    await page.waitForTimeout(200);
    await expect(page.locator('.flashcard')).toHaveClass(/flipped/);
  });

  test('should not show answer input for math cards, keeping self-grading buttons', async ({ page }) => {
    await page.goto('/');

    // Navigate to Math category
    await page.waitForSelector('.category-button', { timeout: 5000 });
    const categories = page.locator('.category-button');
    const count = await categories.count();

    let mathCategoryFound = false;
    for (let i = 0; i < count; i++) {
      const categoryName = await categories.nth(i).locator('.category-name').textContent();
      if (categoryName.toLowerCase().includes('math')) {
        await categories.nth(i).click();
        mathCategoryFound = true;
        break;
      }
    }

    if (!mathCategoryFound) {
      test.skip();
      return;
    }

    await page.waitForSelector('.deck-button', { timeout: 5000 });
    await page.locator('.deck-button').first().click();

    // Start test mode
    await page.waitForSelector('.test-button');
    await page.locator('.test-button').click();
    await page.waitForTimeout(400);

    // No typed-answer input on math cards; self-grading buttons remain available
    await expect(page.locator('.answer-input')).not.toBeVisible();
    await expect(page.locator('.check-button')).toBeVisible();
    await expect(page.locator('.x-button')).toBeVisible();
  });

  test('should reveal text instead of flipping when spelling is wrong in Spell Mode', async ({ page }) => {
    await page.goto('/');

    // Navigate through category to study page
    await page.waitForSelector('.category-button');
    await page.locator('.category-button').first().click();
    await page.waitForSelector('.deck-button');
    await page.locator('.deck-button').first().click();
    await page.waitForSelector('.flashcard', { timeout: 5000 });

    // Enable Spell Mode before starting test mode (settings panel is hidden during test mode)
    const spellModeToggle = page.locator('.settings-panel .toggle-switch').nth(0);
    await spellModeToggle.click();
    await page.waitForTimeout(300);

    // Confirm text is hidden by Spell Mode
    const cardContent = page.locator('.card-content').first();
    let opacity = await cardContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.01);

    // Start test mode
    await page.waitForSelector('.test-button');
    await page.locator('.test-button').click();
    await page.waitForTimeout(400);

    // Type an obviously-wrong spelling and check it
    await page.waitForSelector('.answer-input');
    await page.locator('.answer-input').fill('zzz_not_a_real_spelling_zzz');
    await page.locator('.answer-check .check-button').click();

    // Card should reveal the text in place, NOT flip
    await page.waitForTimeout(200);
    await expect(page.locator('.flashcard')).not.toHaveClass(/flipped/);
    opacity = await cardContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0);

    // After the reveal window + sad effect + fade, it should advance and re-hide on the new card
    await page.waitForTimeout(1500 + 800 + 400);
    await expect(page.locator('.flashcard')).not.toHaveClass(/flipped/);
    opacity = await cardContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.01);
  });
});

test.describe('Flashcards App - Math Formula Rendering', () => {
  test('should render LaTeX math formulas correctly', async ({ page }) => {
    await page.goto('/');

    // Navigate to Math category
    await page.waitForSelector('.category-button', { timeout: 5000 });

    // Find and click the Math category (look for "Math" in category name)
    const categories = page.locator('.category-button');
    const count = await categories.count();

    let mathCategoryFound = false;
    for (let i = 0; i < count; i++) {
      const categoryName = await categories.nth(i).locator('.category-name').textContent();
      if (categoryName.toLowerCase().includes('math')) {
        await categories.nth(i).click();
        mathCategoryFound = true;
        break;
      }
    }

    // Skip test if math category not found
    if (!mathCategoryFound) {
      test.skip();
      return;
    }

    // Wait for decks and click first math deck
    await page.waitForSelector('.deck-button', { timeout: 5000 });
    await page.locator('.deck-button').first().click();

    // Wait for flashcard to load
    await page.waitForSelector('.flashcard', { timeout: 5000 });

    // Check that KaTeX elements are present (KaTeX renders math into spans)
    const mathElements = page.locator('.katex');
    const mathCount = await mathElements.count();
    expect(mathCount).toBeGreaterThan(0);

    // Verify the math is visible (not just text)
    const firstMath = mathElements.first();
    await expect(firstMath).toBeVisible();
  });

  test('should apply dynamic font sizing for long formulas', async ({ page }) => {
    await page.goto('/');

    // Navigate to Math category
    await page.waitForSelector('.category-button', { timeout: 5000 });

    const categories = page.locator('.category-button');
    const count = await categories.count();

    let mathCategoryFound = false;
    for (let i = 0; i < count; i++) {
      const categoryName = await categories.nth(i).locator('.category-name').textContent();
      if (categoryName.toLowerCase().includes('math')) {
        await categories.nth(i).click();
        mathCategoryFound = true;
        break;
      }
    }

    if (!mathCategoryFound) {
      test.skip();
      return;
    }

    // Navigate to first math deck
    await page.waitForSelector('.deck-button', { timeout: 5000 });
    await page.locator('.deck-button').first().click();

    // Wait for flashcard to load
    await page.waitForSelector('.flashcard', { timeout: 5000 });

    // Get the card content element
    const cardContent = page.locator('.card-content').first();

    // Check that dynamic font size is applied (inline style)
    const fontSize = await cardContent.evaluate(el => el.style.fontSize);
    expect(fontSize).toBeTruthy();
    expect(fontSize).toMatch(/\d+(\.\d+)?rem/);
  });

  test('should flip card and show math formula on back', async ({ page }) => {
    await page.goto('/');

    // Navigate to Math category
    await page.waitForSelector('.category-button', { timeout: 5000 });

    const categories = page.locator('.category-button');
    const count = await categories.count();

    let mathCategoryFound = false;
    for (let i = 0; i < count; i++) {
      const categoryName = await categories.nth(i).locator('.category-name').textContent();
      if (categoryName.toLowerCase().includes('math')) {
        await categories.nth(i).click();
        mathCategoryFound = true;
        break;
      }
    }

    if (!mathCategoryFound) {
      test.skip();
      return;
    }

    // Navigate to first math deck
    await page.waitForSelector('.deck-button', { timeout: 5000 });
    await page.locator('.deck-button').first().click();

    // Wait for flashcard to load
    await page.waitForSelector('.flashcard', { timeout: 5000 });

    // Click to flip the card
    await page.locator('.flashcard-container').click();
    await page.waitForTimeout(600);

    // Verify card is flipped
    const flashcard = page.locator('.flashcard');
    await expect(flashcard).toHaveClass(/flipped/);

    // Verify math formulas are still rendered on back
    const mathElements = page.locator('.katex');
    const mathCount = await mathElements.count();
    expect(mathCount).toBeGreaterThan(0);
  });
});
