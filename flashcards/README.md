# Multi-Language Flashcards App

A React-based flashcard application for language learning with audio pronunciation support and multiple study modes.

## Features

### Core Functionality
- **Multi-language Support**: Study flashcards for Spanish, Chinese, French, and more
- **Hierarchical Navigation**: Browse categories and decks organized by topic
- **Audio Pronunciation**: Play native speaker audio for vocabulary words (powered by Google Gemini TTS)
- **Dynamic Loading**: CSV-based flashcard data loaded from manifest

### Study Modes
- **Standard Study Mode**: Flip cards, mark as memorized, and track progress
- **Test Mode**: Randomized quiz with scoring and failed card review
- **Spell Mode**: Audio-first learning where text is hidden until revealed
  - Text hidden by default when navigating to cards
  - Click card to reveal text and check your spelling
  - Auto-play audio automatically enabled
  - Perfect for practicing spelling and pronunciation

### Study Controls
- **Front/Back Toggle**: Switch which side of the card shows first
- **Auto-play Audio**: Automatically play audio when cards appear
- **Navigation**: Previous/Next buttons to move through cards
- **Memorization Tracking**:
  - "Got It" - Remove card from active deck
  - "Not Yet" - Reinsert card for later review
- **Deck Management**:
  - Shuffle - Randomize card order
  - Reset - Start over with all cards
  - Test - Enter test mode

### Smart Features
- **Consistent Colors**: Card colors always match data columns (purple/pink) regardless of Front/Back setting
- **Smooth Transitions**: Fade effects when navigating between cards
- **Mobile Responsive**: Optimized layout for mobile devices
- **Settings Persistence**: Study preferences saved to localStorage

## Getting Started

### Prerequisites
- Node.js and npm installed
- Audio files generated using the TTS tools (see parent directory)

### Installation

```bash
npm install
```

### Running the App

```bash
npm start
# or use the convenience script
../start.sh
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run tests in headed mode with single worker
npx playwright test --headed --workers=1

# Run specific test suite
npx playwright test --grep "Spell Mode"
```

## Project Structure

```
flashcards/
├── public/
│   └── data/              # CSV flashcard files and audio
│       ├── manifest.json  # Auto-generated list of available decks
│       ├── *.csv         # Flashcard data files
│       └── */            # Audio folders (one per CSV file)
├── src/
│   ├── App.js            # Main app with routing
│   ├── Home.js           # Category selection page
│   ├── Category.js       # Deck selection page
│   ├── Study.js          # Flashcard study interface
│   ├── FlashCard.js      # Individual flashcard component
│   ├── SettingsContext.js # Global settings state
│   └── components/
│       └── SettingsPanel.js # Study mode settings UI
├── e2e/
│   └── flashcards.spec.js # Playwright e2e tests
└── playwright.config.js   # Test configuration
```

## Adding New Flashcard Decks

1. Add your CSV file to `public/data/` (format: `category_deckname.csv`)
2. Generate audio using `uv run tools/generate_flashcard_audio.py <csv_file>`
3. Update manifest: `uv run tools/update_manifest.py`
4. Reload the app - new deck appears automatically

## CSV Format

### Basic Format
```csv
Column1,Column2
front text,back text
word,translation
```
The app displays Column1 on the front and Column2 on the back by default.

### Advanced Header Mapping
You can control which columns appear on which side of the card using trailing numbers in the header:

- **Side Assignment**:
  - `Header 1`: Forces column to the **Front** side.
  - `Header 2`: Forces column to the **Back** side.
  - The first column assigned to a side becomes the **Primary** text.
  - The second column assigned to a side becomes the **Secondary** text.

- **Secondary Text Positioning**:
  - `Header ^1`: Front side, secondary text displayed **ABOVE** primary.
  - `Header ^2`: Back side, secondary text displayed **ABOVE** primary.
  - Without the `^` prefix, secondary text is displayed **BELOW** primary.

- **Audio Redirection**:
  - If a header ends in a number (e.g., `Pinyin 1`), the audio for that card side will be fetched using the text from the column index specified by that number (1-based).
  - Example: `Chinese,Pinyin 1,English 2`
    - Front Side: Shows "Chinese" (Primary) and "Pinyin" (Secondary).
    - Front Audio: Uses text from Column 1 ("Chinese").
    - Back Side: Shows "English".

### Multi-line Support
Use `\n` or `\\n` within a CSV cell to create line breaks on the card.

### Math Support
Wrap LaTeX formulas in `$...$` (e.g., `$x^2$`) for mathematical rendering.

## Technology Stack

- **React** - UI framework
- **React Router** - Navigation
- **Playwright** - E2E testing
- **Google Gemini TTS** - Audio generation (see tools/)

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run test:e2e`
Runs Playwright e2e tests in headless mode

### `npm run test:e2e:ui`
Opens Playwright UI for interactive testing

## Learn More

- [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React documentation](https://reactjs.org/)
- [Playwright documentation](https://playwright.dev/)
