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


def update_manifest():
    """
    Scan the data folder for CSV files and update manifest.json.
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

    # Build manifest entries
    manifest = []
    for csv_file in csv_files:
        manifest.append({
            'name': format_name(csv_file.name),
            'file': csv_file.name
        })

    # Write manifest.json
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')  # Add trailing newline

    print(f"✓ Updated {manifest_path}")
    print(f"  Found {len(manifest)} CSV file(s):")
    for entry in manifest:
        print(f"    - {entry['name']} ({entry['file']})")


if __name__ == '__main__':
    update_manifest()
