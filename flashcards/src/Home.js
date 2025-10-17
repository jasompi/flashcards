import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const [csvFiles, setCsvFiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // List of CSV files in the data folder
    const files = [
      { name: 'Words', file: 'words.csv' },
      { name: 'Countries & Capitals', file: 'spanish_speaking_countries_and_capitals.csv' }
    ];
    setCsvFiles(files);
  }, []);

  const handleFileSelect = (file) => {
    navigate(`/study/${file}`);
  };

  return (
    <div className="home">
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