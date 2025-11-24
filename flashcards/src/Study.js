import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSettings } from './SettingsContext';
import FlashCard from './FlashCard';
import SettingsPanel from './components/SettingsPanel';
import './Study.css';

function Study() {
  const { filename } = useParams();
  const navigate = useNavigate();
  const { showFrontFirst, spellMode } = useSettings();
  const [cards, setCards] = useState([]);
  const [activeDeck, setActiveDeck] = useState([]); // Indices of cards still in deck
  const [currentDeckIndex, setCurrentDeckIndex] = useState(0);
  const [memorized, setMemorized] = useState(new Set()); // Set of memorized card indices
  const [history, setHistory] = useState([]); // History of shown cards for undo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false); // Control flip state from parent
  const [isTransitioning, setIsTransitioning] = useState(false); // For fade effect
  const [isTestMode, setIsTestMode] = useState(false); // Track if in test mode
  const [testFailedCards, setTestFailedCards] = useState(new Set()); // Cards marked "Not Yet" in test
  const [testCompleted, setTestCompleted] = useState(false); // Track if test is completed
  const [textRevealed, setTextRevealed] = useState(false); // Track if text is revealed in spell mode
  const [displayFrontFirst, setDisplayFrontFirst] = useState(showFrontFirst); // Local state for delayed display update
  const [effect, setEffect] = useState(null); // Track current animation effect ('celebrate' or 'sad')

  useEffect(() => {
    const loadCSV = async () => {
      try {
        // Check if filename contains multiple decks (comma-separated)
        const filenames = filename.includes(',') ? filename.split(',') : [filename];
        const isMultiDeck = filenames.length > 1;

        let allCards = [];
        let commonDatasetName = '';

        // Load each CSV file
        for (const file of filenames) {
          const response = await fetch(`/data/${file}`);
          if (!response.ok) {
            throw new Error(`Failed to load CSV file: ${file}`);
          }
          const text = await response.text();
          const rows = text.split('\n').filter(row => row.trim() !== '');

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
                  // Escaped quote (two consecutive quotes)
                  currentCell += '"';
                  i++; // Skip next quote
                } else {
                  // Toggle quote state
                  insideQuotes = !insideQuotes;
                }
              } else if (char === ',' && !insideQuotes) {
                // End of cell
                cells.push(currentCell.trim());
                currentCell = '';
              } else {
                currentCell += char;
              }
            }
            // Add last cell
            cells.push(currentCell.trim());
            return cells;
          };

          // Parse header row to detect audio column references and secondary text columns
          const headerRow = parseCSVRow(rows[0]);
          let col1AudioIndex = 0;  // Default: column 1 uses its own text (index 0)
          let col2AudioIndex = 1;  // Default: column 2 uses its own text (index 1)
          let col1SecondaryIndex = -1;
          let col2SecondaryIndex = -1;
          let col1SecondaryAbove = false;  // Default: secondary text below primary
          let col2SecondaryAbove = false;

          // Check column 1 header for audio reference
          const col1Tokens = headerRow[0].split(' ');
          const col1LastToken = col1Tokens[col1Tokens.length - 1];
          if (!isNaN(col1LastToken)) {
            col1AudioIndex = parseInt(col1LastToken) - 1;  // Convert to 0-based index
          }

          // Check column 2 header for audio reference
          const col2Tokens = headerRow[1].split(' ');
          const col2LastToken = col2Tokens[col2Tokens.length - 1];
          if (!isNaN(col2LastToken)) {
            col2AudioIndex = parseInt(col2LastToken) - 1;
          }

          // Check remaining columns for secondary text (starting from index 2, after front/back)
          for (let i = 2; i < headerRow.length; i++) {
            const header = headerRow[i];
            const tokens = header.split(' ');
            const lastToken = tokens[tokens.length - 1];

            if (lastToken === '1' || lastToken === '^1') {
              col1SecondaryIndex = i;
              col1SecondaryAbove = lastToken === '^1';
            } else if (lastToken === '2' || lastToken === '^2') {
              col2SecondaryIndex = i;
              col2SecondaryAbove = lastToken === '^2';
            }
          }

          // Helper to get audio text with validation
          const getAudioText = (cells, audioIndex) => {
            if (audioIndex < 0 || audioIndex >= cells.length) return null;
            const text = cells[audioIndex]?.trim();
            return text || null;  // Return null if empty
          };

          // Get dataset name for audio loading
          const datasetName = file.replace('.csv', '');
          if (commonDatasetName === '') {
            commonDatasetName = datasetName;
          }

          // Skip header row and parse data
          const deckCards = rows.slice(1).map(row => {
            const cells = parseCSVRow(row);
            const cardData = {
              front: cells[0] || '',
              back: cells[1] || '',
              frontAudio: getAudioText(cells, col1AudioIndex),
              backAudio: getAudioText(cells, col2AudioIndex),
              frontSecondary: col1SecondaryIndex >= 0 ? cells[col1SecondaryIndex] : null,
              backSecondary: col2SecondaryIndex >= 0 ? cells[col2SecondaryIndex] : null,
              frontSecondaryAbove: col1SecondaryAbove,
              backSecondaryAbove: col2SecondaryAbove,
              sourceFile: isMultiDeck ? file : null, // Track source for multi-deck
              datasetName: datasetName // Track dataset name for audio loading
            };
            return cardData;
          });

          allCards = allCards.concat(deckCards);
        }

        setCards(allCards);
        // Initialize active deck with all card indices
        setActiveDeck(allCards.map((_, index) => index));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadCSV();
  }, [filename]);

  // Reset flip state and text reveal when card changes
  useEffect(() => {
    setIsFlipped(false);
    setTextRevealed(false);
  }, [currentDeckIndex, activeDeck]);

  // Reset text reveal when spell mode is toggled
  useEffect(() => {
    setTextRevealed(false);
  }, [spellMode]);

  // Handle Front/Back switch with fade transition in spell mode
  const prevShowFrontFirstRef = React.useRef(showFrontFirst);
  useEffect(() => {
    const showFrontFirstChanged = prevShowFrontFirstRef.current !== showFrontFirst;

    // Only run if showFrontFirst actually changed (not on initial mount or other updates)
    if (showFrontFirstChanged && spellMode) {
      // Immediately hide text
      setTextRevealed(false);

      // Start fade-out transition
      setIsTransitioning(true);

      // Switch content mid-fade (when opacity is very low)
      setTimeout(() => {
        setDisplayFrontFirst(showFrontFirst);
      }, 150);

      // Complete fade-in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    } else if (showFrontFirstChanged) {
      // If not in spell mode, switch immediately
      setDisplayFrontFirst(showFrontFirst);
    }
    prevShowFrontFirstRef.current = showFrontFirst;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFrontFirst]); // Only depend on showFrontFirst, not spellMode or textRevealed

  const shuffleDeck = () => {
    // Fade out content first
    setIsTransitioning(true);
    setTextRevealed(false);

    // If card is flipped, flip to front first
    if (isFlipped) {
      setIsFlipped(false);
    }

    // Wait for fade out before shuffling
    setTimeout(() => {
      const shuffled = [...activeDeck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setActiveDeck(shuffled);
      setCurrentDeckIndex(0);
      setHistory([]); // Clear history on shuffle

      // Fade in new content after a brief moment
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  const resetDeck = () => {
    // Fade out content first
    setIsTransitioning(true);
    setTextRevealed(false);

    // If card is flipped, flip to front first
    if (isFlipped) {
      setIsFlipped(false);
    }

    // Wait for fade out before resetting
    setTimeout(() => {
      setMemorized(new Set());
      setActiveDeck(cards.map((_, index) => index));
      setCurrentDeckIndex(0);
      setHistory([]); // Clear history on reset
      setIsTestMode(false);
      setTestFailedCards(new Set());
      setTestCompleted(false);

      // Fade in new content after a brief moment
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  const handleStartTest = () => {
    // Fade out content first
    setIsTransitioning(true);
    setTextRevealed(false);

    // If card is flipped, flip to front first
    if (isFlipped) {
      setIsFlipped(false);
    }

    // Wait for fade out before starting test
    setTimeout(() => {
      // Reset memorized state
      setMemorized(new Set());
      setTestFailedCards(new Set());
      setTestCompleted(false);

      // Shuffle all cards
      const allCards = cards.map((_, index) => index);
      const shuffled = [...allCards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Start test mode
      setActiveDeck(shuffled);
      setCurrentDeckIndex(0);
      setHistory([]);
      setIsTestMode(true);

      // Fade in new content after a brief moment
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  const handleCompleteTest = () => {
    // Mark all remaining cards as failed
    const remainingCards = new Set([...testFailedCards, ...activeDeck]);
    setTestFailedCards(remainingCards);

    // Clear active deck to trigger completion
    setActiveDeck([]);
    setTestCompleted(true);
  };

  const handlePrevious = () => {
    // Fade out content
    setIsTransitioning(true);
    setTextRevealed(false); // Reset text reveal immediately

    // If card is flipped, flip to front first
    if (isFlipped) {
      setIsFlipped(false);
    }

    // Wait 300ms (fade out + half flip) before updating card
    setTimeout(() => {
      updatePrevious();
      // Fade in new content after a brief moment
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  const updatePrevious = () => {
    if (history.length === 0) {
      // Loop to end of deck if no history
      const prevIndex = currentDeckIndex === 0 ? activeDeck.length - 1 : currentDeckIndex - 1;
      setCurrentDeckIndex(prevIndex);
      return;
    }

    // Get the previous state from history
    const previousState = history[history.length - 1];

    // Restore previous state
    setActiveDeck(previousState.deck);
    setCurrentDeckIndex(previousState.index);
    setMemorized(previousState.memorized);

    // Remove from history
    setHistory(history.slice(0, -1));
  };

  const saveToHistory = () => {
    // Save current state to history
    setHistory([...history, {
      deck: [...activeDeck],
      index: currentDeckIndex,
      memorized: new Set(memorized)
    }]);
  };

  const handleMemorized = () => {
    // Trigger celebration effect
    setEffect('celebrate');

    // Wait for celebration animation to play (800ms to match sad animation)
    setTimeout(() => {
      setEffect(null);

      // Fade out content
      setIsTransitioning(true);
      setTextRevealed(false); // Reset text reveal immediately

      // If card is flipped, flip to front first
      if (isFlipped) {
        setIsFlipped(false);
      }

      // Wait 300ms (fade out + half flip) before updating card
      setTimeout(() => {
        updateMemorized();
        // Fade in new content after a brief moment
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 300);
    }, 800);
  };

  const updateMemorized = () => {
    // Save state to history before making changes
    saveToHistory();

    const currentCardIndex = activeDeck[currentDeckIndex];

    // Mark as memorized
    const newMemorized = new Set(memorized);
    newMemorized.add(currentCardIndex);
    setMemorized(newMemorized);

    // Remove from active deck
    const newDeck = activeDeck.filter((_, idx) => idx !== currentDeckIndex);
    setActiveDeck(newDeck);

    // In test mode, check if test is complete
    if (isTestMode && newDeck.length === 0) {
      setTestCompleted(true);
    } else {
      // Adjust current index if needed
      if (currentDeckIndex >= newDeck.length && newDeck.length > 0) {
        setCurrentDeckIndex(newDeck.length - 1);
      }
    }
  };

  const handleReviewFailedCards = () => {
    // Reset for review of failed cards
    const failedCardIndices = Array.from(testFailedCards);
    setActiveDeck(failedCardIndices);
    setCurrentDeckIndex(0);
    setTestCompleted(false);
    setIsTestMode(false); // Exit test mode for review
    setTestFailedCards(new Set());
  };

  const handleNotMemorized = () => {
    // Trigger sad effect
    setEffect('sad');

    // Wait for sad animation to play (800ms for slower animation)
    setTimeout(() => {
      setEffect(null);

      // Fade out content
      setIsTransitioning(true);
      setTextRevealed(false); // Reset text reveal immediately

      // If card is flipped, flip to front first
      if (isFlipped) {
        setIsFlipped(false);
      }

      // Wait 300ms (fade out + half flip) before updating card
      setTimeout(() => {
        updateNotMemorized();
        // Fade in new content after a brief moment
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 300);
    }, 800);
  };

  const updateNotMemorized = () => {
    // Save state to history before making changes
    saveToHistory();

    const currentCardIndex = activeDeck[currentDeckIndex];

    if (isTestMode) {
      // In test mode: mark as failed and remove from deck (don't reinsert)
      const newFailedCards = new Set(testFailedCards);
      newFailedCards.add(currentCardIndex);
      setTestFailedCards(newFailedCards);

      // Remove from active deck
      const newDeck = activeDeck.filter((_, idx) => idx !== currentDeckIndex);
      setActiveDeck(newDeck);

      // Check if test is complete
      if (newDeck.length === 0) {
        setTestCompleted(true);
      } else {
        // Adjust current index if needed
        if (currentDeckIndex >= newDeck.length) {
          setCurrentDeckIndex(newDeck.length - 1);
        }
      }
    } else {
      // In study mode: reinsert card at random position
      const newDeck = [...activeDeck];

      // Remove current card
      newDeck.splice(currentDeckIndex, 1);

      // Insert at random position after current position
      const remainingCards = newDeck.length - currentDeckIndex;
      if (remainingCards > 0) {
        const randomOffset = Math.floor(Math.random() * Math.min(remainingCards, 5)) + 1;
        const insertPosition = Math.min(currentDeckIndex + randomOffset, newDeck.length);
        newDeck.splice(insertPosition, 0, currentCardIndex);
      } else {
        // If at end, add to end
        newDeck.push(currentCardIndex);
      }

      setActiveDeck(newDeck);

      // Stay at same index (shows next card)
      if (currentDeckIndex >= newDeck.length) {
        setCurrentDeckIndex(0);
      }
    }
  };

  const handleNext = () => {
    // Fade out content
    setIsTransitioning(true);
    setTextRevealed(false); // Reset text reveal immediately

    // If card is flipped, flip to front first
    if (isFlipped) {
      setIsFlipped(false);
    }

    // Wait 300ms (fade out + half flip) before updating card
    setTimeout(() => {
      updateNext();
      // Fade in new content after a brief moment
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 300);
  };

  const updateNext = () => {
    // Save state to history before making changes
    saveToHistory();

    // Move to next card (wrap around to beginning if at end)
    const nextIndex = (currentDeckIndex + 1) % activeDeck.length;
    setCurrentDeckIndex(nextIndex);
  };

  const handleBack = () => {
    // Extract category from filename (e.g., "spanish_vocabulary.csv" -> "spanish")
    // For multi-deck, extract from first filename
    const firstFilename = filename.split(',')[0];
    const categoryId = firstFilename.split('_')[0].toLowerCase();
    navigate(`/category/${categoryId}`);
  };

  const handleHome = () => {
    navigate('/');
  };

  if (loading) {
    return <div className="study">Loading...</div>;
  }

  if (error) {
    return (
      <div className="study">
        <div className="error">Error: {error}</div>
        <button onClick={handleBack}>Back to Home</button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="study">
        <div className="error">No cards found</div>
        <button onClick={handleBack}>Back to Home</button>
      </div>
    );
  }

  // Extract and format category name for back button (used in multiple places)
  const filenames = filename.split(',');
  const isMultiDeck = filenames.length > 1;
  const firstFilename = filenames[0];
  const categoryId = firstFilename.split('_')[0].toLowerCase();
  const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);

  // For multi-deck, use the first deck's dataset name for audio (all should be compatible)
  const datasetName = firstFilename.replace('.csv', '');

  // Check if test is completed
  if (testCompleted) {
    const totalCards = cards.length;
    const failedCount = testFailedCards.size;
    const correctCount = totalCards - failedCount;
    const score = ((correctCount / totalCards) * 100).toFixed(0);
    const isPerfectScore = failedCount === 0;

    return (
      <div className="study">
        {!isTestMode && <SettingsPanel />}
        <button className="back-button" onClick={handleBack}>
          ← {categoryName}
        </button>
        <div className={`completion-message ${isPerfectScore ? 'perfect-score' : ''}`}>
          {isPerfectScore ? (
            <>
              <h2 className="celebration">🎊 Perfect Score! 🎊</h2>
              <p className="score-text">You got all {totalCards} cards correct!</p>
            </>
          ) : (
            <>
              <h2>Test Complete!</h2>
              <p className="score-text">Score: {correctCount}/{totalCards} ({score}%)</p>
              <p>{failedCount} card{failedCount !== 1 ? 's' : ''} to review</p>
            </>
          )}
          <div className="test-controls">
            {!isPerfectScore && (
              <button className="nav-button review-button" onClick={handleReviewFailedCards}>
                🔍 Review Failed Cards
              </button>
            )}
            <button className="nav-button retake-button" onClick={handleStartTest}>
              📝 Retake Test
            </button>
            <button className="nav-button" onClick={handleHome}>
              ← Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if all cards are memorized
  if (activeDeck.length === 0) {
    return (
      <div className="study">
        {!isTestMode && <SettingsPanel />}
        <button className="back-button" onClick={handleBack}>
          ← {categoryName}
        </button>
        <div className="completion-message">
          <h2>🎉 Congratulations!</h2>
          <p>You've memorized all {cards.length} cards!</p>
          <button className="nav-button" onClick={resetDeck}>
            Start Over
          </button>
          <button className="nav-button" onClick={handleHome}>
            ← Home
          </button>
        </div>
      </div>
    );
  }

  const currentCardIndex = activeDeck[currentDeckIndex];
  const currentCard = cards[currentCardIndex];

  return (
    <div className="study">
      {!isTestMode && <SettingsPanel />}
      <button className="back-button" onClick={handleBack}>
        ← {categoryName}
      </button>

      <div className="progress">
        Card {currentDeckIndex + 1} of {activeDeck.length} remaining
        {memorized.size > 0 && ` • ${memorized.size} memorized`}
        {isMultiDeck && ` • Combined: ${filenames.length} decks`}
      </div>

      <FlashCard
        front={displayFrontFirst ? currentCard.front : currentCard.back}
        back={displayFrontFirst ? currentCard.back : currentCard.front}
        frontAudioText={displayFrontFirst ? currentCard.frontAudio : currentCard.backAudio}
        backAudioText={displayFrontFirst ? currentCard.backAudio : currentCard.frontAudio}
        frontSecondary={displayFrontFirst ? currentCard.frontSecondary : currentCard.backSecondary}
        backSecondary={displayFrontFirst ? currentCard.backSecondary : currentCard.frontSecondary}
        frontSecondaryAbove={displayFrontFirst ? currentCard.frontSecondaryAbove : currentCard.backSecondaryAbove}
        backSecondaryAbove={displayFrontFirst ? currentCard.backSecondaryAbove : currentCard.frontSecondaryAbove}
        col1={currentCard.front}
        col2={currentCard.back}
        showFrontFirst={displayFrontFirst}
        datasetName={currentCard.datasetName || datasetName}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        isTransitioning={isTransitioning}
        spellMode={spellMode}
        textRevealed={textRevealed}
        setTextRevealed={setTextRevealed}
        effect={effect}
      />

      <div className="navigation">
        <button
          onClick={handlePrevious}
          className="nav-button previous-button"
          title="Go back to previous card"
        >
          ←<span className="button-text"> Previous</span>
        </button>
        <button
          onClick={handleNotMemorized}
          className="nav-button x-button"
          title="Not memorized - card will reappear"
        >
          ✗<span className="button-text"> Not Yet</span>
        </button>
        <button
          onClick={handleMemorized}
          className="nav-button check-button"
          title="Memorized - remove from deck"
        >
          ✓<span className="button-text"> Got It</span>
        </button>
        <button
          onClick={handleNext}
          className="nav-button next-button"
          title="Skip to next card without marking"
        >
          <span className="button-text">Next </span>→
        </button>
      </div>

      <div className="deck-controls">
        {isTestMode ? (
          <button onClick={handleCompleteTest} className="deck-button complete-button">
            ✓<span className="button-text"> Complete Test</span>
          </button>
        ) : (
          <>
            <button onClick={shuffleDeck} className="deck-button shuffle-button">
              ⇄<span className="button-text"> Shuffle</span>
            </button>
            <button onClick={resetDeck} className="deck-button reset-button">
              ⏻<span className="button-text"> Reset</span>
            </button>
            <button onClick={handleStartTest} className="deck-button test-button">
              📝<span className="button-text"> Test</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Study;