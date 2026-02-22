# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-02-21

### Added
- **Automated Card Creation Skill**: Added a Gemini CLI skill to automate the creation of flashcards from images (OCR).
  - Support for Spanish and Chinese vocabulary extraction.
  - Automatic Pinyin generation for Chinese words.
  - Automatic English translation for Chinese words.
  - Seamless integration with the existing deck building workflow.

## [1.3.0] - 2025-11-20

### Added
- **Multi-Line Text Support**: Use `
` or actual newlines in CSV fields to create line breaks.
- **Improved Math Sizing**: Dynamic font sizing adjusted to prevent formula wrapping.
- **Secondary Text Positioning Control**: "^1" and "^2" notation to display secondary text above primary text.

## [1.2.0] - 2025-10-15

### Added
- **Multi-Deck Combination**: Select and study multiple flashcard decks together in a single session.
- **Deck Compatibility Validation**: Ensure only compatible decks (matching header structures) can be combined.
- **Math Formula Rendering**: KaTeX integration for LaTeX math formulas in cards.
- **Dynamic Font Sizing**: Automatic font size adjustment based on formula length.

## [1.1.0] - 2025-10-01

### Added
- **Spell Mode**: Audio-first learning feature for spelling practice.
- **Visual Feedback Animations**: "Got It" and "Not Yet" buttons with tactile animations.
- **Secondary Text Display**: Show additional text below primary text on flashcards.
- **Audio Column Mapping**: Control which column's text is used for audio retrieval.

## [1.0.0] - 2025-10-01

### Added
- Multi-language support (Spanish, Chinese, Math).
- Hierarchical navigation (Home -> Category -> Study).
- Spaced repetition system.
- AI-generated audio pronunciations.
