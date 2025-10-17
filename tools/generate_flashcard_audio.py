#!/usr/bin/env python3
"""
Generic tool to generate audio files for flashcard CSV data.

This tool reads a CSV file with two columns and generates Spanish audio
pronunciation WAV files for all unique words using Google's Gemini TTS API.
Audio files are organized in a folder with the same name as the CSV file.

Usage:
    uv run tools/generate_flashcard_audio.py <csv_file_path>

Example:
    uv run tools/generate_flashcard_audio.py data/words.csv
    # Creates: data/words/el_muchacho.wav, data/words/boy.wav, etc.
"""

import requests
import pandas as pd
import base64
import wave
import time
import json
import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variable
API_KEY = os.getenv('GEMINI_API_KEY')
if not API_KEY:
    print("Error: GEMINI_API_KEY not found in environment variables.")
    print("Please create a .env file with GEMINI_API_KEY=your_api_key")
    sys.exit(1)


def pcm_to_wav(pcm_data, sample_rate, num_channels=1, sample_width=2):
    """
    Converts raw PCM audio data into a WAV file format.

    Args:
        pcm_data (bytes): The raw PCM audio data (signed 16-bit).
        sample_rate (int): The sample rate of the audio (e.g., 24000).
        num_channels (int): The number of audio channels (e.g., 1 for mono).
        sample_width (int): The width of each audio sample in bytes (e.g., 2 for 16-bit).

    Returns:
        bytes: The in-memory WAV file data.
    """
    temp_file = "temp_audio.wav"
    with wave.open(temp_file, 'wb') as wav_file:
        wav_file.setnchannels(num_channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)

    with open(temp_file, 'rb') as f:
        wav_file_data = f.read()

    # Clean up temp file
    if os.path.exists(temp_file):
        os.remove(temp_file)

    return wav_file_data


def generate_silence_pcm(duration_ms, sample_rate, num_channels=1, sample_width=2):
    """
    Generate silence (zeros) PCM data.

    Args:
        duration_ms (int): Duration of silence in milliseconds.
        sample_rate (int): Sample rate (e.g., 24000).
        num_channels (int): Number of channels (1 for mono).
        sample_width (int): Sample width in bytes (2 for 16-bit).

    Returns:
        bytes: Silent PCM data.
    """
    num_samples = int(sample_rate * duration_ms / 1000)
    num_bytes = num_samples * num_channels * sample_width
    return b'\x00' * num_bytes


def generate_audio_pcm(text, retries=5, backoff_factor=1):
    """
    Generates audio PCM data from text using the Gemini TTS API.

    Args:
        text (str): The text to be converted to speech.
        retries (int): The number of times to retry the API call on failure.
        backoff_factor (int): The backoff factor for exponential retry delay.

    Returns:
        tuple: (pcm_data, sample_rate) if successful, (None, None) otherwise.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={API_KEY}"

    payload = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": "Leda"}
                }
            }
        },
        "model": "gemini-2.5-flash-preview-tts"
    }

    for i in range(retries):
        try:
            response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))

            # Handle 429 rate limit errors with longer backoff
            if response.status_code == 429:
                retry_after = response.headers.get('Retry-After')
                if retry_after:
                    delay = int(retry_after)
                    print(f"⚠ Rate limit hit for '{text}'. Waiting {delay}s (from Retry-After header)...")
                else:
                    # Use exponential backoff with minimum 2 seconds for rate limits
                    delay = max(2, backoff_factor * (2 ** i))
                    print(f"⚠ Rate limit hit for '{text}'. Waiting {delay}s before retry {i + 1}/{retries}...")

                if i < retries - 1:
                    time.sleep(delay)
                    continue
                else:
                    print(f"✗ Maximum retries reached for '{text}' due to rate limiting. Skipping.")
                    return None, None

            response.raise_for_status()

            result = response.json()
            part = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0]
            audio_data_base64 = part.get('inlineData', {}).get('data')
            mime_type = part.get('inlineData', {}).get('mimeType')

            if audio_data_base64 and mime_type and mime_type.startswith("audio/"):
                sample_rate = int(mime_type.split('rate=')[1])
                pcm_data = base64.b64decode(audio_data_base64)
                return pcm_data, sample_rate
            else:
                print(f"✗ Error: No audio data found in response for '{text}'.")
                return None, None

        except requests.exceptions.RequestException as e:
            print(f"✗ Attempt {i + 1}/{retries} failed for '{text}': {e}")
            if i < retries - 1:
                time.sleep(backoff_factor * (2 ** i))
            else:
                print(f"✗ Maximum retries reached for '{text}'. Skipping.")
                return None, None

    return None, None


def generate_and_save_audio(text, output_filename, pause_duration_ms=500, retries=5, backoff_factor=1, quiet=False):
    """
    Generates audio from text using the Gemini TTS API and saves it as a WAV file.
    Handles "/" separator by generating audio for each part with pauses in between.
    Includes exponential backoff for API call retries.

    Args:
        text (str): The text to be converted to speech. Can contain "/" to separate multiple phrases.
        output_filename (str): The full path to the output WAV file.
        pause_duration_ms (int): Duration of pause between phrases in milliseconds (default 500ms).
        retries (int): The number of times to retry the API call on failure.
        backoff_factor (int): The backoff factor for exponential retry delay.
        quiet (bool): If True, suppress informational messages.

    Returns:
        bool: True if successful, False otherwise.
    """
    # Check if the file already exists to avoid redundant API calls
    if os.path.exists(output_filename):
        return True

    # Check if text contains "/" separator
    if '/' in text:
        # Split by "/" and strip whitespace from each part
        parts = [part.strip() for part in text.split('/') if part.strip()]

        if not parts:
            if not quiet:
                print(f"✗ Error: No valid text parts found in '{text}'.")
            return False

        # Generate audio for each part
        combined_pcm = b''
        sample_rate = None

        for idx, part in enumerate(parts):
            pcm_data, rate = generate_audio_pcm(part, retries, backoff_factor)

            if pcm_data is None:
                if not quiet:
                    print(f"✗ Failed to generate audio for part '{part}'.")
                return False

            if sample_rate is None:
                sample_rate = rate
            elif sample_rate != rate:
                if not quiet:
                    print(f"✗ Error: Sample rate mismatch ({sample_rate} vs {rate}).")
                return False

            # Add PCM data
            combined_pcm += pcm_data

            # Add pause between parts (but not after the last part)
            if idx < len(parts) - 1:
                silence = generate_silence_pcm(pause_duration_ms, sample_rate)
                combined_pcm += silence

        # Convert combined PCM to WAV and save
        wav_data = pcm_to_wav(combined_pcm, sample_rate)
        with open(output_filename, 'wb') as f:
            f.write(wav_data)

        return True

    else:
        # No "/" separator, generate normally
        pcm_data, sample_rate = generate_audio_pcm(text, retries, backoff_factor)

        if pcm_data is None:
            return False

        # Convert PCM to WAV and save to a file
        wav_data = pcm_to_wav(pcm_data, sample_rate)
        with open(output_filename, 'wb') as f:
            f.write(wav_data)

        return True


def sanitize_filename(text):
    """
    Sanitize text to create a valid filename.
    Replaces spaces with underscores and removes problematic characters.

    Args:
        text (str): The text to sanitize.

    Returns:
        str: Sanitized filename (without extension).
    """
    # Replace spaces with underscores
    filename = text.replace(' ', '_')
    # Replace forward slashes with underscores
    filename = filename.replace('/', '_')
    # Remove other problematic characters
    filename = ''.join(c for c in filename if c.isalnum() or c in ('_', '-', '.'))
    return filename


def process_csv(csv_path):
    """
    Process a CSV file and generate audio for all unique words.

    Args:
        csv_path (str): Path to the CSV file.

    Returns:
        tuple: (success_count, total_count)
    """
    csv_path = Path(csv_path)

    # Validate CSV file exists
    if not csv_path.exists():
        print(f"✗ Error: File '{csv_path}' not found.")
        return 0, 0

    # Create output directory based on CSV filename (without .csv extension)
    output_dir = csv_path.parent / csv_path.stem
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n📁 Processing CSV: {csv_path}")
    print(f"📂 Output directory: {output_dir}\n")

    try:
        # Read CSV file
        df = pd.read_csv(csv_path)

        if df.shape[1] < 2:
            print(f"✗ Error: CSV must have at least 2 columns. Found {df.shape[1]}.")
            return 0, 0

        # Collect all unique words from both columns
        words = set()
        for col in df.columns[:2]:  # Only process first two columns
            words.update(df[col].dropna().unique())

        words = sorted(words)  # Sort for consistent ordering
        total_count = len(words)

        # Generate audio for each word with progress bar
        success_count = 0
        with tqdm(total=total_count, desc="Generating audio", unit="file",
                  bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]') as pbar:
            for word in words:
                word_str = str(word).strip()
                if not word_str:
                    continue

                filename = sanitize_filename(word_str) + '.wav'
                output_path = output_dir / filename

                # Update progress bar description with current word
                pbar.set_postfix_str(f"'{word_str}' -> {filename}", refresh=True)

                if generate_and_save_audio(word_str, str(output_path), quiet=True):
                    success_count += 1

                pbar.update(1)

        print(f"\n{'='*60}")
        print(f"✓ Complete: {success_count}/{total_count} files generated successfully")
        print(f"📂 Audio files saved to: {output_dir}")
        print(f"{'='*60}\n")

        return success_count, total_count

    except Exception as e:
        print(f"✗ Error processing CSV: {e}")
        return 0, 0


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description='Generate Spanish audio files for flashcard CSV data.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run tools/generate_flashcard_audio.py data/words.csv
  uv run tools/generate_flashcard_audio.py flashcards/public/data/spanish_speaking_countries_and_capitals.csv
        """
    )
    parser.add_argument('csv_file', help='Path to the CSV file')

    args = parser.parse_args()

    success, total = process_csv(args.csv_file)

    # Exit with appropriate status code
    sys.exit(0 if success == total else 1)


if __name__ == "__main__":
    main()