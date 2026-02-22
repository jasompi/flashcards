---
name: create-flashcards-from-image
description: "Extract vocabulary from an image using OCR, translate/pinyinify as needed, and create a flashcard CSV followed by deck building. Use when a user provides an image path for new flashcards."
---

# Create Flashcards from Image

## Workflow

1.  **Image Extraction (OCR)**: Use `read_file` to read the image path provided by the user. Rely on the model's vision capabilities to extract all text from the image accurately.

2.  **Data Processing**:
    *   **Spanish Vocabulary**: 
        *   Columns: `Spanish, English`
        *   Combine multiple forms (e.g., masculine/feminine) in the same cell using `/` or `;`.
        *   Merge multi-line phrases where the following line is indented.
    *   **Chinese Vocabulary**:
        *   Columns: `Chinese, Pinyin ^1, English Meaning 2`
        *   Translate Chinese words to English if not provided.
        *   Generate Pinyin with tone marks for the `Pinyin ^1` column.
    *   **General**: Clean up OCR noise and ensure consistent capitalization.

3.  **CSV Creation**:
    *   Ask the user for a descriptive name for the deck (e.g., `spanish_new_words` or `chinese_lesson_10`).
    *   Save the formatted data as a CSV file in `flashcards/public/data/`.

4.  **Deck Building**:
    *   Once the CSV is saved, proceed with the `buildcard` command:
    ```bash
    gemini run buildcard flashcards/public/data/[deck_name].csv
    ```

## Example Triggers
- "Create a new Spanish deck from this image: /path/to/img.jpg"
- "Use OCR on /Users/name/Downloads/chinese_list.png and make flashcards"
- "/Users/jasompi/Downloads/IMG_4233.jpg" (followed by a request for flashcards)
