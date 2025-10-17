import React, { useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import './FlashCard.css';

function FlashCard({ front, back, datasetName }) {
  const { autoPlay } = useSettings();
  const [isFlipped, setIsFlipped] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState({ front: false, back: false });
  const [audio, setAudio] = useState(null);

  // Sanitize filename to match Python's sanitize_filename function
  const sanitizeFilename = (text) => {
    // Replace spaces with underscores
    let filename = text.replace(/ /g, '_');
    // Replace forward slashes with underscores
    filename = filename.replace(/\//g, '_');
    // Remove other problematic characters (keep only alphanumeric, underscore, hyphen, period)
    filename = filename.replace(/[^a-zA-Z0-9_\-.]/g, '');
    return filename;
  };

  useEffect(() => {
    // Check if audio files exist for front and back
    const checkAudio = async () => {
      const frontFilename = sanitizeFilename(front);
      const backFilename = sanitizeFilename(back);
      const frontPath = `/data/${datasetName}/${frontFilename}.wav`;
      const backPath = `/data/${datasetName}/${backFilename}.wav`;

      // Check if files exist by attempting to fetch them
      const checkFile = async (path) => {
        try {
          const response = await fetch(path, { method: 'HEAD' });
          return response.ok;
        } catch {
          return false;
        }
      };

      const [frontExists, backExists] = await Promise.all([
        checkFile(frontPath),
        checkFile(backPath)
      ]);

      setAudioAvailable({ front: frontExists, back: backExists });

      // Auto-play front audio if enabled and available
      if (autoPlay && frontExists) {
        const newAudio = new Audio(frontPath);
        setAudio(newAudio);
        newAudio.play().catch(err => {
          console.error('Error auto-playing audio:', err);
        });
      }
    };

    if (datasetName) {
      checkAudio();
    }

    // Reset flip state when card changes
    setIsFlipped(false);
  }, [front, back, datasetName, autoPlay]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);

    // Auto-play audio for the back side when flipping if auto-play is enabled
    if (autoPlay && !isFlipped && audioAvailable.back) {
      const filename = sanitizeFilename(back);
      const audioPath = `/data/${datasetName}/${filename}.wav`;

      // Stop current audio
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      // Play back audio
      const newAudio = new Audio(audioPath);
      setAudio(newAudio);
      newAudio.play().catch(err => {
        console.error('Error auto-playing audio:', err);
      });
    }
  };

  const handlePlayAudio = (e) => {
    e.stopPropagation(); // Prevent card flip when clicking audio button

    const currentText = isFlipped ? back : front;
    const filename = sanitizeFilename(currentText);
    const audioPath = `/data/${datasetName}/${filename}.wav`;

    // Stop any currently playing audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Create and play new audio
    const newAudio = new Audio(audioPath);
    setAudio(newAudio);
    newAudio.play().catch(err => {
      console.error('Error playing audio:', err);
    });
  };

  return (
    <div className="flashcard-container" onClick={handleFlip}>
      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">
          <button
            className="audio-button"
            onClick={handlePlayAudio}
            disabled={!audioAvailable.front}
            title={audioAvailable.front ? 'Play audio' : 'Audio not available'}
          >
            🔊
          </button>
          <div className="card-content">
            {front}
          </div>
        </div>
        <div className="flashcard-back">
          <button
            className="audio-button"
            onClick={handlePlayAudio}
            disabled={!audioAvailable.back}
            title={audioAvailable.back ? 'Play audio' : 'Audio not available'}
          >
            🔊
          </button>
          <div className="card-content">
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashCard;