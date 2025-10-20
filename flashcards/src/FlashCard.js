import React, { useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import './FlashCard.css';

function FlashCard({ front, back, frontAudioText, backAudioText, frontSecondary, backSecondary, col1, col2, showFrontFirst, datasetName, isFlipped, setIsFlipped, isTransitioning, spellMode, textRevealed, setTextRevealed, effect }) {
  const { autoPlay } = useSettings();
  const [audioAvailable, setAudioAvailable] = useState({ front: false, back: false });
  const [audio, setAudio] = useState(null);

  // In spell mode, auto-play is always enabled
  const effectiveAutoPlay = spellMode || autoPlay;

  // Determine which side is showing col1 data (for consistent colors)
  const frontIsCol1 = showFrontFirst;
  const backIsCol1 = !showFrontFirst;

  // Sanitize filename to match Python's sanitize_filename function
  // Python's isalnum() includes Unicode letters (á, ñ, etc.)
  const sanitizeFilename = (text) => {
    // Replace spaces with underscores
    let filename = text.replace(/ /g, '_');
    // Replace forward slashes with underscores
    filename = filename.replace(/\//g, '_');
    // Remove other problematic characters (keep Unicode alphanumeric, underscore, hyphen, period)
    // \p{L} matches any Unicode letter, \p{N} matches any Unicode digit
    filename = filename.replace(/[^\p{L}\p{N}_\-.]/gu, '');
    return filename;
  };

  useEffect(() => {
    // Stop any currently playing audio when card changes or component unmounts
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, back]);

  useEffect(() => {
    // Check if audio files exist for front and back
    const checkAudio = async () => {
      // Use audioText if provided and non-empty, otherwise use display text
      const frontAudioSource = frontAudioText || front;
      const backAudioSource = backAudioText || back;

      const frontFilename = sanitizeFilename(frontAudioSource);
      const backFilename = sanitizeFilename(backAudioSource);

      // Only create paths if we have text to look up
      const frontPath = frontAudioSource ? `/data/${datasetName}/${frontFilename}.wav` : null;
      const backPath = backAudioSource ? `/data/${datasetName}/${backFilename}.wav` : null;

      // Check if files exist by attempting to fetch them
      const checkFile = async (path) => {
        if (!path) return false;  // No path = no audio
        try {
          const response = await fetch(path, { method: 'HEAD' });
          // Check both status and content-type to ensure it's actually an audio file
          const isAudio = response.ok &&
                         response.headers.get('content-type')?.includes('audio');
          return isAudio;
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
      if (effectiveAutoPlay && frontExists && frontPath) {
        const newAudio = new Audio(frontPath);
        setAudio(newAudio);
        newAudio.play().catch(err => {
          // Suppress NotAllowedError - this is expected before user interaction
          if (err.name !== 'NotAllowedError') {
            console.error('Error auto-playing audio:', err);
          }
        });
      }
    };

    if (datasetName && front && back) {
      checkAudio();
    } else {
      // Reset to false if no dataset or card data
      setAudioAvailable({ front: false, back: false });
    }
  }, [front, back, frontAudioText, backAudioText, datasetName, effectiveAutoPlay]);

  const handleFlip = () => {
    // In spell mode, if text not revealed yet, reveal it instead of flipping
    // This should work even during transitions
    if (spellMode && !textRevealed) {
      setTextRevealed(true);
      return;
    }

    // Don't flip if transitioning (only applies to normal flipping)
    if (isTransitioning) {
      return;
    }

    // Stop current audio immediately when flipping
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setIsFlipped(!isFlipped);

    // Auto-play audio for the new side when flipping if auto-play is enabled
    if (effectiveAutoPlay) {
      const targetAudioText = !isFlipped ? (backAudioText || back) : (frontAudioText || front);
      const targetAvailable = !isFlipped ? audioAvailable.back : audioAvailable.front;

      if (targetAvailable && targetAudioText) {
        const filename = sanitizeFilename(targetAudioText);
        const audioPath = `/data/${datasetName}/${filename}.wav`;

        // Play audio for the new side
        const newAudio = new Audio(audioPath);
        setAudio(newAudio);
        newAudio.play().catch(err => {
          // Suppress NotAllowedError - this is expected before user interaction
          if (err.name !== 'NotAllowedError') {
            console.error('Error auto-playing audio:', err);
          }
        });
      }
    }
  };

  const handlePlayAudio = (e) => {
    e.stopPropagation(); // Prevent card flip when clicking audio button

    const currentAudioText = isFlipped ? (backAudioText || back) : (frontAudioText || front);
    const filename = sanitizeFilename(currentAudioText);
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
      <div className={`flashcard ${isFlipped ? 'flipped' : ''} ${effect ? effect : ''}`}>
        <div className={`flashcard-front ${frontIsCol1 ? 'col1-color' : 'col2-color'}`}>
          {audioAvailable.front && (
            <button
              className="audio-button"
              onClick={handlePlayAudio}
              disabled={!audioAvailable.front}
              title={audioAvailable.front ? 'Play audio' : 'Audio not available'}
            >
              🔊
            </button>
          )}
          <div className={`card-content ${isTransitioning ? 'transitioning' : ''} ${spellMode && !textRevealed ? 'hidden' : ''}`}>
            <div className="card-content-primary">{front}</div>
            {frontSecondary && (
              <div className="card-content-secondary">{frontSecondary}</div>
            )}
          </div>
        </div>
        <div className={`flashcard-back ${backIsCol1 ? 'col1-color' : 'col2-color'}`}>
          {audioAvailable.back && (
            <button
              className="audio-button"
              onClick={handlePlayAudio}
              disabled={!audioAvailable.back}
              title={audioAvailable.back ? 'Play audio' : 'Audio not available'}
            >
              🔊
            </button>
          )}
          <div className={`card-content ${isTransitioning ? 'transitioning' : ''} ${spellMode && !textRevealed ? 'hidden' : ''}`}>
            <div className="card-content-primary">{back}</div>
            {backSecondary && (
              <div className="card-content-secondary">{backSecondary}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashCard;