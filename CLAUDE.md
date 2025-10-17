# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Spanish language learning tool with two main components:
1. **React Flashcard App** - Interactive web app for learning Spanish vocabulary and geography
2. **Audio Generation Tools** - Python scripts that generate Spanish audio pronunciations using Google's Gemini TTS API with the Leda voice

## Key Commands

### Flashcard App
Launch the React flashcard application:
```bash
./start.sh
# or
cd flashcards && npm start
```

### Audio Generation
Generate audio for any CSV flashcard file:
```bash
uv run tools/generate_flashcard_audio.py <csv_file_path>
```

Examples:
```bash
# Generate audio for vocabulary words
uv run tools/generate_flashcard_audio.py flashcards/public/data/vocabulary_level_1.csv

# Generate audio for countries and capitals
uv run tools/generate_flashcard_audio.py flashcards/public/data/spanish_speaking_countries_and_capitals.csv
```

### Manifest Management
Update the flashcard app's manifest when CSV files are added, removed, or renamed:
```bash
uv run tools/update_manifest.py
```

This automatically scans `flashcards/public/data/` for CSV files and updates `manifest.json`, which the React app uses to display available flashcard sets on the home page.

Legacy scripts (specific to one CSV):
```bash
# Note: countries_capitals.py has been removed
# Use the generic tool instead for countries/capitals
uv run main.py  # Entry point (minimal)
```

## Project Structure

- `flashcards/` - React flashcard application
  - `src/` - React components (App, Home, Study, FlashCard)
  - `public/data/` - CSV data files, audio folders, and manifest.json
    - `manifest.json` - Auto-generated list of available CSV files (updated by `update_manifest.py`)
- `tools/` - Utility scripts
  - `generate_flashcard_audio.py` - Generic tool to generate audio for any CSV flashcard file
  - `update_manifest.py` - Updates manifest.json with available CSV files
- `data/` - Source CSV data files (legacy location)
- `main.py` - Entry point (currently minimal)
- `start.sh` - Launch script for flashcard app
- `.env` - Environment variables (API keys) - **DO NOT COMMIT**
- `.env.example` - Template for environment variables

## Flashcard App Dynamic Loading

The React app dynamically loads CSV files from `flashcards/public/data/manifest.json`. When you add, remove, or rename CSV files in the `flashcards/public/data/` folder:

1. Run `uv run tools/update_manifest.py` to regenerate the manifest
2. Reload the home page to see the updated list

The app automatically:
- Displays human-readable names (e.g., "Vocabulary Level 1" from `vocabulary_level_1.csv`)
- Checks for audio file availability and disables the play button if audio doesn't exist
- Loads audio from the folder matching the CSV filename (without .csv extension)

## API Configuration

**IMPORTANT**: This project uses Google Gemini TTS API. The API key is stored in a `.env` file (not committed to git).

**Setup:**
1. Copy the template: `cp .env.example .env`
2. Add your API key to `.env`: `GEMINI_API_KEY=your_api_key_here`
3. Get your API key from: https://makersuite.google.com/app/apikey

The TTS configuration uses:
- Model: `gemini-2.5-flash-preview-tts`
- Voice: `Leda` (Spanish voice)
- Output format: PCM converted to WAV (24kHz sample rate)

## Audio Generation Architecture

The `tools/generate_flashcard_audio.py` script:
- Accepts any CSV file with at least 2 columns as input
- Extracts all unique words from both columns
- Creates an output directory named after the CSV file (without .csv extension)
- Generates WAV files named after each word (sanitized for filesystem)
- Skips files that already exist to avoid redundant API calls
- Implements exponential backoff retry logic (5 retries by default)
- Converts base64-encoded PCM audio response to WAV format

Example folder structure after running:
```
flashcards/public/data/
├── vocabulary_level_1.csv
├── vocabulary_level_1/
│   ├── el_muchacho.wav
│   ├── boy.wav
│   └── ...
├── spanish_speaking_countries_and_capitals.csv
└── spanish_speaking_countries_and_capitals/
    ├── Argentina.wav
    ├── Buenos_Aires.wav
    └── ...
```

## Dependencies

Managed via `uv` (see `pyproject.toml`):
- `pandas` - CSV processing
- `requests` - API calls
- `python-dotenv` - Environment variable management
- Built-in: `wave`, `base64`, `json`, `os`, `time`

Install dependencies:
```bash
uv sync
```

If you don't have `uv` installed:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```
