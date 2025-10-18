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
from google.cloud import texttospeech

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


def trim_audio_beginning(pcm_data, trim_ms, sample_rate, num_channels=1, sample_width=2):
    """
    Trim the beginning of PCM audio data.

    Args:
        pcm_data (bytes): The raw PCM audio data.
        trim_ms (int): Duration to trim from the beginning in milliseconds.
        sample_rate (int): Sample rate (e.g., 24000).
        num_channels (int): Number of channels (1 for mono).
        sample_width (int): Sample width in bytes (2 for 16-bit).

    Returns:
        bytes: Trimmed PCM data.
    """
    # Calculate number of bytes to trim
    trim_samples = int(sample_rate * trim_ms / 1000)
    trim_bytes = trim_samples * num_channels * sample_width

    # Don't trim more than available
    trim_bytes = min(trim_bytes, len(pcm_data))

    # Return trimmed data
    return pcm_data[trim_bytes:]


def generate_audio_pcm(text, language='es-US', retries=5, backoff_factor=1, verbose=False):
    """
    Generates audio PCM data from text using the Gemini TTS API.

    Args:
        text (str): The text to be converted to speech.
        language (str): Language code (e.g., 'es-US' for Spanish, 'en-US' for English).
                       Used to generate appropriate language prompt for Gemini TTS.
        retries (int): The number of times to retry the API call on failure.
        backoff_factor (int): The backoff factor for exponential retry delay.
        verbose (bool): If True, print detailed error messages.

    Returns:
        tuple: (pcm_data, sample_rate) if successful, (None, None) otherwise.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={API_KEY}"

    # Generate language-specific prompt
    if language.startswith('en'):
        prompt = f'Say this in US English: "{text}"'
    elif language.startswith('es'):
        prompt = f'Say this in US Spanish: "{text}"'
    else:
        # Default to just the text without language instruction
        prompt = text

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": "Leda"
                    }
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
                if verbose:
                    print(f"   Full response: {json.dumps(result, indent=2)}")
                return None, None

        except requests.exceptions.HTTPError as e:
            print(f"✗ Attempt {i + 1}/{retries} failed for '{text}': {e}")
            if verbose:
                try:
                    error_details = response.json()
                    print(f"   Response status: {response.status_code}")
                    print(f"   Error details: {json.dumps(error_details, indent=2)}")
                except:
                    print(f"   Response text: {response.text}")
            if i < retries - 1:
                time.sleep(backoff_factor * (2 ** i))
            else:
                print(f"✗ Maximum retries reached for '{text}'. Falling back to Google Cloud TTS...")
                return None, None
        except requests.exceptions.RequestException as e:
            print(f"✗ Attempt {i + 1}/{retries} failed for '{text}': {e}")
            if verbose and hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    print(f"   Response status: {e.response.status_code}")
                    print(f"   Error details: {json.dumps(error_details, indent=2)}")
                except:
                    print(f"   Response text: {e.response.text}")
            if i < retries - 1:
                time.sleep(backoff_factor * (2 ** i))
            else:
                print(f"✗ Maximum retries reached for '{text}'. Falling back to Google Cloud TTS...")
                return None, None

    return None, None


def generate_audio_google_cloud_tts(text, lang='es', voice_type='neural2'):
    """
    Generates audio using Google Cloud Text-to-Speech API as a fallback.

    Args:
        text (str): The text to be converted to speech.
        lang (str): Language code ('es' for Spanish, 'en' for English).
        voice_type (str): Voice type ('neural2' for Neural2, 'wavenet' for WaveNet).

    Returns:
        tuple: (audio_data, sample_rate) if successful, (None, None) otherwise.
    """
    try:
        # Initialize the Google Cloud TTS client
        client = texttospeech.TextToSpeechClient()

        # Use SSML with 300ms silence, then we'll trim 200ms to remove click artifacts
        ssml_text = f"<speak><break time='300ms'/>{text}</speak>"
        synthesis_input = texttospeech.SynthesisInput(ssml=ssml_text)

        # Select voice based on language and voice type
        if lang == 'en':
            if voice_type == 'wavenet':
                voice_name = "en-US-Wavenet-F"  # English (US) female WaveNet voice
            else:  # neural2 (default)
                voice_name = "en-US-Neural2-F"  # English (US) female Neural2 voice
            language_code = "en-US"
        else:  # Default to Spanish
            if voice_type == 'wavenet':
                voice_name = "es-US-Wavenet-A"  # Spanish (US) female WaveNet voice
            else:  # neural2 (default)
                voice_name = "es-US-Neural2-A"  # Spanish (US) female Neural2 voice
            language_code = "es-US"

        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
        )

        # Select the type of audio file
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            sample_rate_hertz=24000
        )

        # Perform the text-to-speech request
        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )

        # Trim the first 200ms to remove any click/pop artifacts
        # This leaves 100ms of silence at the beginning
        trimmed_audio = trim_audio_beginning(response.audio_content, trim_ms=200, sample_rate=24000)

        return trimmed_audio, 24000

    except Exception as e:
        print(f"✗ Google Cloud TTS failed for '{text}': {e}")
        return None, None


def detect_language_from_header(header):
    """
    Detect language from column header name.

    Args:
        header (str): Column header name.

    Returns:
        str: Language code ('es' for Spanish, 'en' for English).
    """
    header_lower = str(header).lower()

    # Check for English indicators
    if any(word in header_lower for word in ['english', 'inglés', 'ingles', 'translation', 'meaning']):
        return 'en'

    # Check for Spanish indicators (or default to Spanish)
    if any(word in header_lower for word in ['spanish', 'español', 'espanol', 'palabra', 'word']):
        return 'es'

    # Default to Spanish for ambiguous cases
    return 'es'


def generate_and_save_audio(text, output_filename, lang='es', voice_type='neural2', pause_duration_ms=500, retries=5, backoff_factor=1, quiet=False, verbose=False):
    """
    Generates audio from text using the Gemini TTS API with Google Cloud TTS as fallback.
    Saves the result as a WAV file. Handles "/" separator by generating audio for each part with pauses in between.
    Includes exponential backoff for API call retries.

    Args:
        text (str): The text to be converted to speech. Can contain "/" to separate multiple phrases.
        output_filename (str): The full path to the output WAV file.
        lang (str): Language code ('es' for Spanish, 'en' for English).
        voice_type (str): Voice type for Google Cloud TTS ('neural2' or 'wavenet').
        pause_duration_ms (int): Duration of pause between phrases in milliseconds (default 500ms).
        retries (int): The number of times to retry the API call on failure.
        backoff_factor (int): The backoff factor for exponential retry delay.
        quiet (bool): If True, suppress informational messages.
        verbose (bool): If True, print detailed error messages.

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
            # Convert language code to full format (es -> es-US, en -> en-US)
            language_code = f"{lang}-US"

            # Try Gemini first
            pcm_data, rate = generate_audio_pcm(part, language_code, retries, backoff_factor, verbose)

            # If Gemini fails, try Google Cloud TTS
            if pcm_data is None:
                if not quiet:
                    print(f"⚠ Trying Google Cloud TTS for part '{part}'...")
                pcm_data, rate = generate_audio_google_cloud_tts(part, lang, voice_type)

            if pcm_data is None:
                if not quiet:
                    print(f"✗ Failed to generate audio for part '{part}' using both APIs.")
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

        # Add leading silence to prevent click (100ms)
        leading_silence = generate_silence_pcm(100, sample_rate)
        combined_pcm = leading_silence + combined_pcm

        # Convert combined PCM to WAV and save
        wav_data = pcm_to_wav(combined_pcm, sample_rate)
        with open(output_filename, 'wb') as f:
            f.write(wav_data)

        return True

    else:
        # No "/" separator, generate normally
        # Convert language code to full format (es -> es-US, en -> en-US)
        language_code = f"{lang}-US"

        # Try Gemini first
        pcm_data, sample_rate = generate_audio_pcm(text, language_code, retries, backoff_factor, verbose)

        # If Gemini fails, try Google Cloud TTS
        if pcm_data is None:
            if not quiet:
                print(f"⚠ Trying Google Cloud TTS for '{text}'...")
            pcm_data, sample_rate = generate_audio_google_cloud_tts(text, lang, voice_type)

        if pcm_data is None:
            if not quiet:
                print(f"✗ Failed to generate audio for '{text}' using both APIs.")
            return False

        # Add leading silence to prevent click (100ms)
        leading_silence = generate_silence_pcm(100, sample_rate)
        pcm_data = leading_silence + pcm_data

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


def process_csv(csv_path, verbose=False):
    """
    Process a CSV file and generate audio for all unique words.
    Detects language based on column headers.

    Args:
        csv_path (str): Path to the CSV file.
        verbose (bool): If True, print detailed error messages.

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

        # Detect language for each column based on header
        first_col = df.columns[0]
        second_col = df.columns[1]
        first_col_lang = detect_language_from_header(first_col)
        second_col_lang = detect_language_from_header(second_col)

        print(f"📊 Column languages detected:")
        print(f"   • {first_col}: {first_col_lang.upper()}")
        print(f"   • {second_col}: {second_col_lang.upper()}\n")

        # Build word->language mapping
        word_lang_map = {}

        # Process first column
        for word in df[first_col].dropna().unique():
            word_lang_map[str(word).strip()] = first_col_lang

        # Process second column
        for word in df[second_col].dropna().unique():
            word_lang_map[str(word).strip()] = second_col_lang

        words = sorted(word_lang_map.keys())  # Sort for consistent ordering
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
                lang = word_lang_map.get(word_str, 'es')

                # Update progress bar description with current word
                pbar.set_postfix_str(f"'{word_str}' ({lang.upper()}) -> {filename}", refresh=True)

                if generate_and_save_audio(word_str, str(output_path), lang=lang, quiet=True, verbose=verbose):
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


def test_tts(text, lang='es', api='auto', voice_type='neural2'):
    """
    Test TTS APIs by generating audio for a word/phrase and playing it.

    Args:
        text (str): The text to convert to speech.
        lang (str): Language code ('es' for Spanish, 'en' for English).
        api (str): API to use ('gemini', 'cloud', or 'auto' for fallback).
        voice_type (str): Voice type for Google Cloud TTS ('neural2' or 'wavenet').

    Returns:
        bool: True if successful, False otherwise.
    """
    import tempfile
    import subprocess
    import platform

    print(f"\n🎤 Testing TTS for: '{text}'")
    print(f"   Language: {lang.upper()}")
    print(f"   API mode: {api}")
    print(f"   Voice type: {voice_type}\n")

    # Create temp directory
    temp_dir = Path(tempfile.gettempdir()) / 'spanish_tts_test'
    temp_dir.mkdir(exist_ok=True)

    # Generate sanitized filename with timestamp for comparison
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{sanitize_filename(text)}_{api}_{voice_type}_{timestamp}.wav"
    output_path = temp_dir / filename

    pcm_data = None
    sample_rate = None
    api_used = None

    # Try based on API mode
    if api in ['gemini', 'auto']:
        print("🔄 Trying Gemini TTS API...")
        language_code = f"{lang}-US"
        pcm_data, sample_rate = generate_audio_pcm(text, language_code)
        if pcm_data is not None:
            api_used = 'Gemini'
            print("✓ Gemini TTS succeeded\n")

    if pcm_data is None and api in ['cloud', 'auto']:
        print("🔄 Trying Google Cloud TTS API...")
        pcm_data, sample_rate = generate_audio_google_cloud_tts(text, lang, voice_type)
        if pcm_data is not None:
            api_used = 'Google Cloud'
            print("✓ Google Cloud TTS succeeded\n")

    if pcm_data is None:
        print("✗ Failed to generate audio with all attempted APIs\n")
        return False

    # Save audio file
    wav_data = pcm_to_wav(pcm_data, sample_rate)
    with open(output_path, 'wb') as f:
        f.write(wav_data)

    print(f"✓ Audio saved to: {output_path}")
    print(f"   API used: {api_used}")
    print(f"   Sample rate: {sample_rate} Hz")
    print(f"   (File preserved for comparison)\n")

    # Play audio based on platform
    print("🔊 Playing audio...")
    try:
        system = platform.system()
        if system == 'Darwin':  # macOS
            subprocess.run(['afplay', str(output_path)], check=True)
        elif system == 'Linux':
            # Try multiple players in order of preference
            players = ['paplay', 'aplay', 'mpg123', 'ffplay']
            played = False
            for player in players:
                try:
                    subprocess.run([player, str(output_path)], check=True,
                                 stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
                    played = True
                    break
                except (subprocess.CalledProcessError, FileNotFoundError):
                    continue
            if not played:
                print("⚠ No audio player found. Install paplay, aplay, mpg123, or ffplay.")
                return False
        elif system == 'Windows':
            subprocess.run(['powershell', '-c', f'(New-Object Media.SoundPlayer "{output_path}").PlaySync()'],
                         check=True)
        else:
            print(f"⚠ Audio playback not supported on {system}")
            return False

        print("✓ Playback complete\n")
        return True

    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to play audio: {e}\n")
        return False
    except Exception as e:
        print(f"✗ Error during playback: {e}\n")
        return False


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description='Generate Spanish audio files for flashcard CSV data.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate audio for CSV file
  uv run tools/generate_flashcard_audio.py data/words.csv
  uv run tools/generate_flashcard_audio.py flashcards/public/data/spanish_speaking_countries_and_capitals.csv

  # Test TTS APIs (default: Neural2 voice)
  uv run tools/generate_flashcard_audio.py --test "Hola mundo"
  uv run tools/generate_flashcard_audio.py --test "Hello world" --lang en
  uv run tools/generate_flashcard_audio.py --test "Buenos días" --api gemini
  uv run tools/generate_flashcard_audio.py --test "Good morning" --lang en --api cloud

  # Test with WaveNet voice
  uv run tools/generate_flashcard_audio.py --test "Hello world" --lang en --voice-type wavenet
  uv run tools/generate_flashcard_audio.py --test "Hola mundo" --voice-type wavenet --api cloud
        """
    )
    parser.add_argument('csv_file', nargs='?', help='Path to the CSV file (not used with --test)')
    parser.add_argument('--test', type=str, metavar='TEXT',
                       help='Test mode: generate and play audio for the given text')
    parser.add_argument('--lang', type=str, default='es', choices=['es', 'en'],
                       help='Language for test mode (default: es)')
    parser.add_argument('--api', type=str, default='auto', choices=['gemini', 'cloud', 'auto'],
                       help='API to use in test mode: gemini, cloud, or auto (try gemini then cloud) (default: auto)')
    parser.add_argument('--voice-type', type=str, default='neural2', choices=['neural2', 'wavenet'],
                       help='Voice type for Google Cloud TTS: neural2 (high-quality) or wavenet (premium) (default: neural2)')
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Show detailed error messages from API failures')

    args = parser.parse_args()

    # Test mode
    if args.test:
        success = test_tts(args.test, lang=args.lang, api=args.api, voice_type=args.voice_type)
        sys.exit(0 if success else 1)

    # Normal CSV processing mode
    if not args.csv_file:
        parser.error('csv_file is required when not using --test')

    success, total = process_csv(args.csv_file, verbose=args.verbose)

    # Exit with appropriate status code
    sys.exit(0 if success == total else 1)


if __name__ == "__main__":
    main()