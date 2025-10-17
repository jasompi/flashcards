import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSettings } from './SettingsContext';
import FlashCard from './FlashCard';
import SettingsPanel from './components/SettingsPanel';
import './Study.css';

function Study() {
  const { filename } = useParams();
  const navigate = useNavigate();
  const { showSpanishFirst } = useSettings();
  const [cards, setCards] = useState([]);
  const [activeDeck, setActiveDeck] = useState([]); // Indices of cards still in deck
  const [currentDeckIndex, setCurrentDeckIndex] = useState(0);
  const [memorized, setMemorized] = useState(new Set()); // Set of memorized card indices
  const [history, setHistory] = useState([]); // History of shown cards for undo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false); // Control flip state from parent
  const [isTransitioning, setIsTransitioning] = useState(false); // For fade effect

  useEffect(() => {
    const loadCSV = async () => {
      try {
        const response = await fetch(`/data/${filename}`);
        if (!response.ok) {
          throw new Error('Failed to load CSV file');
        }
        const text = await response.text();
        const rows = text.split('\n').filter(row => row.trim() !== '');

        // Skip header row and parse data
        const data = rows.slice(1).map(row => {
          const [col1, col2] = row.split(',').map(cell => cell.trim());
          return { front: col1, back: col2 };
        });

        setCards(data);
        // Initialize active deck with all card indices
        setActiveDeck(data.map((_, index) => index));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadCSV();
  }, [filename]);

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentDeckIndex]);

  const shuffleDeck = () => {
    const shuffled = [...activeDeck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setActiveDeck(shuffled);
    setCurrentDeckIndex(0);
    setHistory([]); // Clear history on shuffle
  };

  const resetDeck = () => {
    setMemorized(new Set());
    setActiveDeck(cards.map((_, index) => index));
    setCurrentDeckIndex(0);
    setHistory([]); // Clear history on reset
  };

  const handlePrevious = () => {
    if (history.length === 0) return;

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
    // Fade out content
    setIsTransitioning(true);

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

    // Adjust current index if needed
    if (currentDeckIndex >= newDeck.length && newDeck.length > 0) {
      setCurrentDeckIndex(newDeck.length - 1);
    }
  };

  const handleNotMemorized = () => {
    // Fade out content
    setIsTransitioning(true);

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
  };

  const updateNotMemorized = () => {
    // Save state to history before making changes
    saveToHistory();

    // Move to next card and reinsert current card back into deck at random position
    const currentCardIndex = activeDeck[currentDeckIndex];
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
  };

  const handleBack = () => {
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

  // Check if all cards are memorized
  if (activeDeck.length === 0) {
    return (
      <div className="study">
        <SettingsPanel />
        <button className="back-button" onClick={handleBack}>
          ← Back to Home
        </button>
        <div className="completion-message">
          <h2>🎉 Congratulations!</h2>
          <p>You've memorized all {cards.length} cards!</p>
          <button className="reset-button" onClick={resetDeck}>
            Start Over
          </button>
          <button className="nav-button" onClick={handleBack}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const currentCardIndex = activeDeck[currentDeckIndex];
  const currentCard = cards[currentCardIndex];

  return (
    <div className="study">
      <SettingsPanel />
      <button className="back-button" onClick={handleBack}>
        ← Back to Home
      </button>

      <div className="progress">
        Card {currentDeckIndex + 1} of {activeDeck.length} remaining
        {memorized.size > 0 && ` • ${memorized.size} memorized`}
      </div>

      <FlashCard
        front={showSpanishFirst ? currentCard.front : currentCard.back}
        back={showSpanishFirst ? currentCard.back : currentCard.front}
        datasetName={filename.replace('.csv', '')}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        isTransitioning={isTransitioning}
      />

      <div className="navigation">
        <button
          onClick={handlePrevious}
          disabled={history.length === 0}
          className="nav-button previous-button"
          title="Go back to previous card"
        >
          ← Previous
        </button>
        <button
          onClick={handleNotMemorized}
          className="nav-button x-button"
          title="Not memorized - card will reappear"
        >
          ✗ Not Yet
        </button>
        <button
          onClick={handleMemorized}
          className="nav-button check-button"
          title="Memorized - remove from deck"
        >
          ✓ Got It
        </button>
      </div>

      <div className="deck-controls">
        <button onClick={shuffleDeck} className="deck-button shuffle-button">
          🔀 Shuffle Deck
        </button>
        <button onClick={resetDeck} className="deck-button reset-button">
          ↺ Reset All
        </button>
      </div>
    </div>
  );
}

export default Study;