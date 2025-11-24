import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SettingsPanel from './components/SettingsPanel';
import './Category.css';

function Category() {
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { categoryId } = useParams();

  // Multi-select mode state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDecks, setSelectedDecks] = useState(new Set());
  const [deckSchemas, setDeckSchemas] = useState({});
  const [constraintSchema, setConstraintSchema] = useState(null);
  const [pressTimer, setPressTimer] = useState(null);

  // Helper function to parse CSV row handling quoted fields
  const parseCSVRow = (row) => {
    const cells = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    return cells;
  };

  // Extract deck schema from CSV header
  const getDeckSchema = (headerRow) => {
    const headers = parseCSVRow(headerRow);

    // Extract audio column references
    const col1Tokens = headers[0].split(' ');
    const col1LastToken = col1Tokens[col1Tokens.length - 1];
    const col1AudioIndex = !isNaN(col1LastToken) ? parseInt(col1LastToken) - 1 : 0;

    const col2Tokens = headers[1].split(' ');
    const col2LastToken = col2Tokens[col2Tokens.length - 1];
    const col2AudioIndex = !isNaN(col2LastToken) ? parseInt(col2LastToken) - 1 : 1;

    // Detect secondary text columns
    let col1Secondary = -1;
    let col2Secondary = -1;
    let col1SecondaryHeader = null;
    let col2SecondaryHeader = null;
    let col1SecondaryAbove = false;
    let col2SecondaryAbove = false;

    for (let i = 2; i < headers.length; i++) {
      const tokens = headers[i].split(' ');
      const lastToken = tokens[tokens.length - 1];
      if (lastToken === '1' || lastToken === '^1') {
        col1Secondary = i;
        col1SecondaryHeader = headers[i];
        col1SecondaryAbove = lastToken === '^1';
      }
      if (lastToken === '2' || lastToken === '^2') {
        col2Secondary = i;
        col2SecondaryHeader = headers[i];
        col2SecondaryAbove = lastToken === '^2';
      }
    }

    // Get the base header names (without audio references)
    const col1Header = headers[0];
    const col2Header = headers[1];

    return {
      col1AudioIndex,
      col2AudioIndex,
      col1Secondary,
      col2Secondary,
      col1SecondaryAbove,
      col2SecondaryAbove,
      col1Header, // Include header name for compatibility check
      col2Header, // Include header name for compatibility check
      col1SecondaryHeader,
      col2SecondaryHeader
    };
  };

  // Check if two deck schemas are compatible
  const areDecksCompatible = (schemaA, schemaB) => {
    return JSON.stringify(schemaA) === JSON.stringify(schemaB);
  };

  // Load deck schema from CSV file
  const loadDeckSchema = async (filename) => {
    try {
      const response = await fetch(`/data/${filename}`);
      if (!response.ok) return null;
      const text = await response.text();
      const rows = text.split('\n').filter(row => row.trim() !== '');
      if (rows.length === 0) return null;
      return getDeckSchema(rows[0]);
    } catch (err) {
      console.error(`Failed to load schema for ${filename}:`, err);
      return null;
    }
  };

  useEffect(() => {
    // Load manifest and find the category
    const loadManifest = async () => {
      try {
        const response = await fetch('/data/manifest.json');
        if (!response.ok) {
          throw new Error('Failed to load manifest');
        }
        const data = await response.json();

        // Find the category by ID
        const foundCategory = data.categories.find(cat => cat.id === categoryId);
        if (!foundCategory) {
          throw new Error(`Category '${categoryId}' not found`);
        }
        setCategory(foundCategory);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadManifest();
  }, [categoryId]);

  const handleDeckSelect = (file) => {
    if (multiSelectMode) {
      // In multi-select mode, toggle selection instead of navigating
      handleDeckToggle(file);
    } else {
      // Normal mode: navigate to study
      navigate(`/study/${file}`);
    }
  };

  const handleDeckToggle = async (file) => {
    const newSelected = new Set(selectedDecks);

    if (newSelected.has(file)) {
      // Deselect
      newSelected.delete(file);
      setSelectedDecks(newSelected);

      // If all deselected, clear constraint
      if (newSelected.size === 0) {
        setConstraintSchema(null);
      }
    } else {
      // Select
      newSelected.add(file);
      setSelectedDecks(newSelected);

      // If this is the first selection, set constraint
      if (constraintSchema === null) {
        const schema = await loadDeckSchema(file);
        if (schema) {
          setConstraintSchema(schema);
          // Load schemas for all decks to check compatibility
          const schemas = {};
          for (const deck of category.decks) {
            schemas[deck.file] = await loadDeckSchema(deck.file);
          }
          setDeckSchemas(schemas);
        }
      }
    }
  };

  // Long-press detection handlers
  const handleDeckPressStart = async (file) => {
    const timer = setTimeout(async () => {
      // Enter multi-select mode with this deck selected
      setMultiSelectMode(true);
      setSelectedDecks(new Set([file]));

      // Load schema and set constraint
      const schema = await loadDeckSchema(file);
      if (schema) {
        setConstraintSchema(schema);
        // Load all deck schemas
        const schemas = {};
        for (const deck of category.decks) {
          schemas[deck.file] = await loadDeckSchema(deck.file);
        }
        setDeckSchemas(schemas);
      }
    }, 300);
    setPressTimer(timer);
  };

  const handleDeckPressEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  // Multi-select control functions
  const handleStudySelected = () => {
    if (selectedDecks.size === 0) return;

    // Combine selected decks into comma-separated string
    const deckList = Array.from(selectedDecks).join(',');
    navigate(`/study/${deckList}`);
  };

  const handleCancelMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedDecks(new Set());
    setConstraintSchema(null);
    setDeckSchemas({});
  };

  // Check if a deck is compatible with the constraint
  const isDeckCompatible = (file) => {
    if (!constraintSchema) return true;
    const deckSchema = deckSchemas[file];
    if (!deckSchema) return true; // Unknown schema, allow selection
    return areDecksCompatible(constraintSchema, deckSchema);
  };

  if (loading) {
    return (
      <div className="category">
        <SettingsPanel />
        <button className="back-button" onClick={() => navigate('/')}>
          ← Home
        </button>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category">
        <SettingsPanel />
        <button className="back-button" onClick={() => navigate('/')}>
          ← Home
        </button>
        <h1>Error</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="category">
      <SettingsPanel />
      <button className="back-button" onClick={() => navigate('/')}>
        ← Home
      </button>
      <h1>{category.name}</h1>
      {multiSelectMode ? (
        <p className="multi-select-prompt">Select multiple decks to study together</p>
      ) : (
        <>
          <p>Select a deck to study:</p>
          {category.decks.length > 1 && (
            <p className="hint-text">Long press to select multiple decks</p>
          )}
        </>
      )}
      <div className="deck-list">
        {category.decks.map((deck, index) => {
          const isSelected = selectedDecks.has(deck.file);
          const isCompatible = isDeckCompatible(deck.file);
          const isDisabled = multiSelectMode && !isCompatible && !isSelected;

          return (
            <button
              key={index}
              className={`deck-button ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && handleDeckSelect(deck.file)}
              onMouseDown={() => !multiSelectMode && handleDeckPressStart(deck.file)}
              onMouseUp={handleDeckPressEnd}
              onMouseLeave={handleDeckPressEnd}
              onTouchStart={() => !multiSelectMode && handleDeckPressStart(deck.file)}
              onTouchEnd={handleDeckPressEnd}
              disabled={isDisabled}
            >
              {deck.name}
            </button>
          );
        })}
      </div>
      {multiSelectMode && (
        <div className="multi-select-controls">
          <button
            className="study-selected-button"
            onClick={handleStudySelected}
            disabled={selectedDecks.size === 0}
          >
            Study
          </button>
          <button className="cancel-multi-select-button" onClick={handleCancelMultiSelect}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default Category;
