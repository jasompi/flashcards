# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Spanish language learning tool that generates audio pronunciations for Spanish-speaking countries, capitals, and vocabulary words using Google's Gemini TTS API. The project uses the Leda voice for consistent Spanish pronunciation.

## Key Commands

Run the main script (for vocabulary words):
```bash
python main.py
```

Generate audio for countries and capitals:
```bash
python countries_capitals.py
```

## Project Structure

- `countries_capitals.py` - Generates audio files for Spanish-speaking countries and capitals from CSV data. Outputs to `spanish_speaking_countries_and_capitals/` directory
- `main.py` - Entry point (currently minimal, likely intended for vocabulary word processing)
- `words.csv` - Spanish-English vocabulary word pairs
- `spanish_speaking_countries_and_capitals.csv` - List of Spanish-speaking countries and their capitals (stored in the audio output directory)

## API Configuration

**IMPORTANT**: This project uses Google Gemini TTS API. The API key is currently hardcoded in `countries_capitals.py:10` but should be moved to an environment variable before committing any changes.

The TTS configuration uses:
- Model: `gemini-2.5-flash-preview-tts`
- Voice: `Leda` (Spanish voice)
- Output format: PCM converted to WAV (24kHz sample rate)

## Audio Generation Architecture

The `generate_and_save_audio()` function:
- Checks if audio file already exists to avoid redundant API calls
- Implements exponential backoff retry logic (5 retries by default)
- Converts base64-encoded PCM audio response to WAV format
- Names files by replacing spaces with underscores in the text

Audio files are cached - the script skips generating files that already exist.

## Dependencies

Managed via `uv` (see `pyproject.toml`):
- `pandas` - CSV processing
- `requests` - API calls
- Built-in: `wave`, `base64`, `json`, `os`, `time`
