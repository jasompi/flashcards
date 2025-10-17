import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsPanel from './components/SettingsPanel';
import './Home.css';

function Home() {
  const [csvFiles, setCsvFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load CSV files from manifest
    const loadManifest = async () => {
      try {
        const response = await fetch('/data/manifest.json');
        if (!response.ok) {
          throw new Error('Failed to load manifest');
        }
        const files = await response.json();
        setCsvFiles(files);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadManifest();
  }, []);

  const handleFileSelect = (file) => {
    navigate(`/study/${file}`);
  };

  if (loading) {
    return (
      <div className="home">
        <SettingsPanel />
        <h1>Spanish Flashcards</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <SettingsPanel />
        <h1>Spanish Flashcards</h1>
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="home">
      <SettingsPanel />
      <h1>Spanish Flashcards</h1>
      <p>Select a topic to study:</p>
      <div className="file-list">
        {csvFiles.map((item, index) => (
          <button
            key={index}
            className="file-button"
            onClick={() => handleFileSelect(item.file)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Home;