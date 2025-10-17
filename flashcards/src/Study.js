import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FlashCard from './FlashCard';
import './Study.css';

function Study() {
  const { filename } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadCSV();
  }, [filename]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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

  return (
    <div className="study">
      <button className="back-button" onClick={handleBack}>
        ← Back to Home
      </button>

      <div className="progress">
        Card {currentIndex + 1} of {cards.length}
      </div>

      <FlashCard
        front={cards[currentIndex].front}
        back={cards[currentIndex].back}
        datasetName={filename.replace('.csv', '')}
      />

      <div className="navigation">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="nav-button"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="nav-button"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default Study;