# Gemini CLI Context: Flashcards App

This project is a multi-language flashcard application for learning languages (Spanish, Chinese), math concepts, and more. It features a React frontend, Python-based audio generation tools, and automated data management.

## Project Overview

*   **Architecture:** React SPA (frontend) + Python utility scripts (data/audio processing).
*   **Key Features:**
    *   **Hierarchical Navigation:** Home → Category → Study Deck.
    *   **Data-Driven:** Decks are dynamically loaded from CSV files in `flashcards/public/data/`.
    *   **Audio Support:** Automated audio pronunciation generation using Google Gemini TTS (primary) and Google Cloud TTS (fallback).
    *   **Math Rendering:** LaTeX support using KaTeX for complex formulas.
    *   **Study Modes:** Standard Study, Test Mode (with scoring), and Spell Mode (audio-first learning).
    *   **Spaced Repetition:** Simple "Got It" / "Not Yet" tracking with re-insertion logic.
    *   **Multi-Deck Support:** Ability to combine multiple compatible decks into a single study session.
*   **Technologies:**
    *   **Frontend:** React 19, React Router 7, KaTeX, React-KaTeX.
    *   **Python Tools:** Python 3.10+, `pandas`, `requests`, `google-cloud-texttospeech`, `python-dotenv`.
    *   **Testing:** Playwright (E2E), Jest/React Testing Library (Unit).
    *   **Infrastructure:** Deployed on Raspberry Pi using Apache.

## Directory Structure

*   `flashcards/`: The main React application.
    *   `src/`: React components and logic.
    *   `public/data/`: CSV data files, generated audio folders, and `manifest.json`.
*   `tools/`: Python utility scripts.
    *   `generate_flashcard_audio.py`: Generates WAV files for flashcard entries.
    *   `update_manifest.py`: Updates `manifest.json` based on available CSV files.
*   `screenshots/`: UI screenshots for documentation.
*   `.env`: API keys for Gemini and Google Cloud (not committed).

## Building and Running

### Development (React App)
1.  Navigate to the app directory: `cd flashcards`
2.  Install dependencies: `npm install`
3.  Start the development server: `npm start` (Shortcut: `./start.sh` from root)

### Python Tools
The project uses `uv` for Python dependency management.
1.  Sync dependencies: `uv sync`
2.  Update the deck manifest: `uv run tools/update_manifest.py`
3.  Generate audio for a deck: `uv run tools/generate_flashcard_audio.py <csv_file_path>`

### Automated Card Creation (Skill)
The project includes a Gemini CLI skill to automate the process of creating flashcards from an image (e.g., a photo of a textbook page).
1.  **Usage**: Provide the image path to Gemini CLI and ask it to create flashcards.
    *   Example: `Create flashcards from /path/to/image.jpg and name it spanish_vocabulary_ch4`
2.  **Workflow**: The skill uses OCR to extract text, translates/pinyinifies as needed, creates the CSV file in `flashcards/public/data/`, generates audio, and updates the manifest.
3.  **Skill Location**: `.gemini/skills/create-flashcards-from-image` (Workspace Scope)

### Testing
1.  Run unit tests: `cd flashcards && npm test`
2.  Run E2E tests: `cd flashcards && npm run test:e2e` (Playwright)

### Deployment
*   The project includes a `deploy.sh` script to build the React app and sync it to a Raspberry Pi server using `rsync`.

*   **Development Conventions**

*   **Data Format:** CSV files in `flashcards/public/data/` should follow the naming convention `{category}_{deck_name}.csv`.
*   **Source Control:** Only commit the CSV source files for new decks. **Do not commit the generated WAV audio files**, as they are generated and cached locally or on the server.
*   **Category Logic:** The first part of the CSV filename (before the first underscore) defines its category (e.g., `spanish_`, `chinese_`, `math_`).
*   **Math Formulas:** Use LaTeX wrapped in `$...$` (e.g., `$x^2$`) in CSV cells for mathematical rendering.
*   **Audio Mapping:** Column headers ending in a number (e.g., `Pinyin 1`) can be used to redirect audio retrieval to a specific column index.
*   **Secondary Text:** Column headers ending in `1`, `2`, `^1`, or `^2` are used for secondary text display (above or below primary text).
*   **Testing:** New features should be accompanied by Playwright E2E tests in `flashcards/e2e/`.
    *   **Crucial Constraint:** Never change `channel: 'chrome'` in `flashcards/playwright.config.js`.
*   **Styling:** Primarily Vanilla CSS in `*.css` files co-located with components.
*   **Coding Style:** React 19 functional components with Hooks. Use `SettingsContext` for global application state (like Spell Mode toggle).

## Audio Generation Details

*   **Dual API:** Uses Gemini TTS as primary (using `Leda` voice for Spanish) and Google Cloud TTS as fallback.
*   **Fallback Sequence:** Gemini TTS -> Google Cloud TTS (Neural2 or WaveNet voices).
*   **Language Detection:** Detects language (es, en, zh) based on CSV column headers.
*   **Processing:** Implements SSML silence padding, exponential backoff retries, and audio trimming to eliminate "click" sounds.
*   **Output:** Generates 24kHz WAV files, cached to avoid redundant API calls.

## Key Files

*   `flashcards/src/App.js`: Routing and main entry point.
*   `flashcards/src/Study.js`: Core flashcard interaction logic.
*   `flashcards/src/Category.js`: Deck selection and multi-select compatibility logic.
*   `tools/generate_flashcard_audio.py`: Main audio generation script with dual-API support.
*   `tools/update_manifest.py`: Automates the generation of `manifest.json` for the frontend.
