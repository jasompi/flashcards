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
    navigate(`/study/${file}`);
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
      <p>Select a deck to study:</p>
      <div className="deck-list">
        {category.decks.map((deck, index) => (
          <button
            key={index}
            className="deck-button"
            onClick={() => handleDeckSelect(deck.file)}
          >
            {deck.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Category;
