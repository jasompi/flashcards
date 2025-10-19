#!/usr/bin/env python3
"""
Update manifest.json with all CSV files in the data folder.

This script scans the flashcards/public/data folder for CSV files
and generates a manifest.json file that the React app uses to
dynamically load available flashcard sets.

Usage:
    uv run tools/update_manifest.py
"""

import json
import os
from pathlib import Path


def format_name(filename):
    """
    Convert a CSV filename to a human-readable name.

    Examples:
        vocabulary_level_1.csv -> Vocabulary Level 1
        spanish_speaking_countries_and_capitals.csv -> Spanish Speaking Countries And Capitals

    Args:
        filename (str): The CSV filename without path.

    Returns:
        str: Human-readable name.
    """
    # Remove .csv extension
    name = filename.replace('.csv', '')
    # Replace underscores with spaces
    name = name.replace('_', ' ')
    # Capitalize each word
    name = ' '.join(word.capitalize() for word in name.split())
    return name


def extract_category_and_name(filename):
    """
    Extract category and deck name from CSV filename.

    Examples:
        spanish_questions_words.csv -> ('spanish', 'Questions Words')
        chinese_history_I_lesson_5.csv -> ('chinese', 'History I Lesson 5')
        vocabulary_level_1.csv -> ('uncategorized', 'Vocabulary Level 1')

    Args:
        filename (str): The CSV filename without path.

    Returns:
        tuple: (category_id, deck_name)
    """
    # Remove .csv extension
    name = filename.replace('.csv', '')

    # Split by underscore and check if there's a prefix
    parts = name.split('_', 1)

    if len(parts) > 1:
        # First part is category, rest is deck name
        category_id = parts[0].lower()
        deck_name_raw = parts[1]
    else:
        # No category prefix, use 'uncategorized'
        category_id = 'uncategorized'
        deck_name_raw = name

    # Format deck name
    deck_name = deck_name_raw.replace('_', ' ')
    deck_name = ' '.join(word.capitalize() for word in deck_name.split())

    return category_id, deck_name


def update_manifest():
    """
    Scan the data folder for CSV files and update manifest.json with hierarchical structure.
    """
    # Get the project root directory (parent of tools/)
    project_root = Path(__file__).parent.parent
    data_dir = project_root / 'flashcards' / 'public' / 'data'
    manifest_path = data_dir / 'manifest.json'

    if not data_dir.exists():
        print(f"Error: Data directory not found: {data_dir}")
        return

    # Find all CSV files
    csv_files = sorted(data_dir.glob('*.csv'))

    if not csv_files:
        print(f"Warning: No CSV files found in {data_dir}")
        return

    # Group files by category
    categories_dict = {}
    for csv_file in csv_files:
        category_id, deck_name = extract_category_and_name(csv_file.name)

        if category_id not in categories_dict:
            # Create category with capitalized name
            category_name = category_id.capitalize()
            categories_dict[category_id] = {
                'name': category_name,
                'id': category_id,
                'decks': []
            }

        # Add deck to category
        categories_dict[category_id]['decks'].append({
            'name': deck_name,
            'file': csv_file.name
        })

    # Sort categories and decks
    categories = []
    for category_id in sorted(categories_dict.keys()):
        category = categories_dict[category_id]
        # Sort decks within category
        category['decks'] = sorted(category['decks'], key=lambda x: x['name'])
        categories.append(category)

    # Build manifest with hierarchical structure
    manifest = {
        'categories': categories
    }

    # Write manifest.json
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')  # Add trailing newline

    print(f"✓ Updated {manifest_path}")
    print(f"  Found {len(categories)} categor{'y' if len(categories) == 1 else 'ies'}:")
    for category in categories:
        print(f"    • {category['name']} ({len(category['decks'])} deck(s))")
        for deck in category['decks']:
            print(f"        - {deck['name']} ({deck['file']})")


if __name__ == '__main__':
    update_manifest()
