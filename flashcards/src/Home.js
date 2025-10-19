import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsPanel from './components/SettingsPanel';
import './Home.css';

function Home() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load categories from manifest
    const loadManifest = async () => {
      try {
        const response = await fetch('/data/manifest.json');
        if (!response.ok) {
          throw new Error('Failed to load manifest');
        }
        const data = await response.json();
        setCategories(data.categories);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadManifest();
  }, []);

  const handleCategorySelect = (categoryId) => {
    navigate(`/category/${categoryId}`);
  };

  if (loading) {
    return (
      <div className="home">
        <SettingsPanel />
        <h1>Flashcards</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <SettingsPanel />
        <h1>Flashcards</h1>
        <p className="error">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="home">
      <SettingsPanel />
      <h1>Flashcards</h1>
      <p>Select a category:</p>
      <div className="category-list">
        {categories.map((category, index) => (
          <button
            key={index}
            className="category-button"
            onClick={() => handleCategorySelect(category.id)}
          >
            <div className="category-icon">📚</div>
            <div className="category-info">
              <div className="category-name">{category.name}</div>
              <div className="category-count">{category.decks.length} deck{category.decks.length !== 1 ? 's' : ''}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Home;