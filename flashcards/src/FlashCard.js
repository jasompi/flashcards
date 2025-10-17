import React, { useState } from 'react';
import './FlashCard.css';

function FlashCard({ front, back }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="flashcard-container" onClick={handleFlip}>
      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">
          <div className="card-content">
            {front}
          </div>
        </div>
        <div className="flashcard-back">
          <div className="card-content">
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashCard;