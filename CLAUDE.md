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
uv run tools/generate_flashcard_audio.py data/words.csv

# Generate audio for countries and capitals
uv run tools/generate_flashcard_audio.py flashcards/public/data/spanish_speaking_countries_and_capitals.csv
```

Legacy scripts (specific to one CSV):
```bash
# Note: countries_capitals.py has been removed
# Use the generic tool instead for countries/capitals
uv run main.py  # Entry point (minimal)
```

## Project Structure

- `flashcards/` - React flashcard application
  - `src/` - React components (App, Home, Study, FlashCard)
  - `public/data/` - CSV data files and audio folders
- `tools/` - Utility scripts
  - `generate_flashcard_audio.py` - Generic tool to generate audio for any CSV flashcard file
- `data/` - Source CSV data files
  - `words.csv` - Spanish-English vocabulary pairs
  - `spanish_speaking_countries_and_capitals.csv` - Countries and their capitals
- `main.py` - Entry point (currently minimal)
- `start.sh` - Launch script for flashcard app
- `.env` - Environment variables (API keys) - **DO NOT COMMIT**
- `.env.example` - Template for environment variables

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
├── words.csv
├── words/
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
