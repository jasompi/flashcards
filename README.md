# Spanish Learning Tools

This project contains tools for learning Spanish, including a React flashcard application and audio generation scripts.

## Live Demo

**Try the app:** https://spanish-flashcards.jpimobile.com

The flashcard app is deployed on a Raspberry Pi server running Apache.

## Flash Card App

An interactive React application that helps kids learn Spanish vocabulary and geography using flashcards.

### Features

- **Home page** with selection of study topics (dynamically loaded from available CSV files)
- **Study page** with interactive flashcards:
  - Click any card to flip between Spanish and English
  - **Audio playback** - Play pronunciation for each word with speaker button
  - **Auto-play mode** - Automatically play audio when showing cards (toggle in settings)
  - **Spaced repetition system**:
    - Mark cards as memorized (✓ Got It) or not yet memorized (✗ Not Yet)
    - Unmemoized cards reappear later in the deck
    - Track progress: cards remaining and cards memorized
    - Complete deck when all cards are memorized
  - **Deck controls**:
    - Previous button to undo accidental selections
    - Shuffle deck to randomize card order
    - Reset to start over with all cards
  - **Settings panel** (top-right):
    - Toggle auto-play audio
    - Toggle showing Spanish or English first
  - Progress indicator showing current card position
  - Responsive design with smooth flip animations
- **Back to Home** button to easily switch topics

### Running the App

#### Quick Start

```bash
./start.sh
```

#### Manual Start

```bash
cd flashcards
npm start
```

The app will open automatically at http://localhost:3000

### How to Use

1. On the home page, select a topic
2. Click on any flashcard to flip between Spanish and English
3. Use the Previous, "✗ Not Yet", and "✓ Got It" buttons to navigate and memorize cards
4. Click "Back to Home" to select a different topic

### Data Files

The flashcard app uses CSV files located in `flashcards/public/data/`:

- `vocabulary_level_1.csv` - Spanish-English vocabulary pairs
- `spanish_speaking_countries_and_capitals.csv` - Spanish-speaking countries and their capitals

## Audio Generation Tools

Python scripts that generate Spanish audio pronunciations using Google's Gemini TTS API with Google Cloud Text-to-Speech as a fallback.

### Features

- **Dual API Support**: Automatically tries Gemini TTS first, falls back to Google Cloud TTS if needed
- **Language Detection**: Automatically detects language from CSV column headers
- **Multi-language Support**: Spanish (es-US) and English (en-US) voices
- **Voice Options**: Neural2 (high-quality) or WaveNet (premium) voices
- **Click-free Audio**: Implements SSML silence padding and audio trimming to eliminate initial click sounds
- **Test Mode**: Test TTS APIs before generating full audio sets

### Generic Audio Generator (Recommended)

Generate audio files for any CSV flashcard file:

```bash
uv run tools/generate_flashcard_audio.py <csv_file_path>
```

**Examples:**

```bash
# Generate audio for vocabulary words
uv run tools/generate_flashcard_audio.py flashcards/public/data/vocabulary_level_1.csv

# Generate audio for countries and capitals
uv run tools/generate_flashcard_audio.py flashcards/public/data/spanish_speaking_countries_and_capitals.csv
```

The script will:

- Read all unique words from both columns of the CSV
- Detect language automatically based on column headers (Spanish/English)
- Create an output folder with the same name as the CSV file (without .csv)
- Generate WAV files for each word using appropriate language voice
- Skip files that already exist to avoid redundant API calls
- Automatically fallback to Google Cloud TTS if Gemini API fails

**Output Structure:**

```
flashcards/public/data/
|-- vocabulary_level_1.csv
|-- vocabulary_level_1/
|   |-- el_muchacho.wav
|   |-- boy.wav
|   +-- ...
|-- spanish_speaking_countries_and_capitals.csv
+-- spanish_speaking_countries_and_capitals/
    |-- Argentina.wav
    |-- Buenos_Aires.wav
    +-- ...
```

### Test Mode

Test TTS APIs before generating audio for full CSV files:

```bash
# Test with auto fallback (default: Neural2 voice)
uv run tools/generate_flashcard_audio.py --test "Hola mundo"
uv run tools/generate_flashcard_audio.py --test "Hello world" --lang en

# Test specific API
uv run tools/generate_flashcard_audio.py --test "Buenos días" --api gemini
uv run tools/generate_flashcard_audio.py --test "Good morning" --lang en --api cloud

# Test with WaveNet voice
uv run tools/generate_flashcard_audio.py --test "Hello world" --lang en --voice-type wavenet
```

**Test Mode Options:**
- `--test TEXT`: Text to generate audio for
- `--lang {es,en}`: Language (default: es)
- `--api {gemini,cloud,auto}`: API to use (default: auto)
- `--voice-type {neural2,wavenet}`: Voice type for Google Cloud TTS (default: neural2)

Audio files are saved to `/tmp/spanish_tts_test/` with timestamp for comparison.

### Configuration

**API Keys Setup:**

This project uses two TTS APIs:
1. **Google Gemini TTS** (primary) - Uses Leda voice for Spanish
2. **Google Cloud Text-to-Speech** (fallback) - Uses Neural2/WaveNet voices

**Step 1: Gemini API Key**

1. Create a `.env` file in the project root:

   ```bash
   cp .env.example .env
   ```

2. Add your Google Gemini API key to the `.env` file:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

   Get your API key from: https://makersuite.google.com/app/apikey

**Step 2: Google Cloud Credentials**

1. Download your Google Cloud service account JSON key file

2. Add the path to your `.env` file:

   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
   ```

   Example:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/Users/yourname/projects/spanish/gen-lang-client-XXXXX.json
   ```

**Complete .env file example:**

```
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=/Users/yourname/projects/spanish/gen-lang-client-XXXXX.json
```

**Voice Configuration:**

- **Gemini TTS**:
  - Voice: `Leda` (Spanish voice)
  - Output: PCM converted to WAV (24kHz)

- **Google Cloud TTS**:
  - Spanish: `es-US-Neural2-A` (Neural2) or `es-US-Wavenet-A` (WaveNet)
  - English: `en-US-Neural2-F` (Neural2) or `en-US-Wavenet-F` (WaveNet)
  - Output: LINEAR16 WAV (24kHz)

Audio files are cached to avoid redundant API calls.

## Project Structure

```
spanish/
  flashcards/           # React flashcard application
    public/data/        # CSV files and audio folders
    src/                # React components
  data/                 # Source CSV data files
  tools/                # Python utility scripts
  main.py               # Main entry point
  start.sh              # Launch script for flashcard app
```

## Dependencies

### Flashcard App

- React
- React Router DOM

Install with:

```bash
cd flashcards
npm install
```

### Python Scripts

Dependencies are managed via `uv` (see `pyproject.toml`):

- pandas - CSV processing
- requests - API calls
- python-dotenv - Environment variable management
- tqdm - Progress bars
- google-cloud-texttospeech - Google Cloud TTS API

Install Python dependencies:

```bash
uv sync
```

If you don't have `uv` installed:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## License

MIT License
