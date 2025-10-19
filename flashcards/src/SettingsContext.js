import React, { createContext, useState, useContext, useEffect } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [autoPlay, setAutoPlay] = useState(() => {
    const saved = localStorage.getItem('autoPlay');
    return saved ? JSON.parse(saved) : false;
  });

  const [showFrontFirst, setShowFrontFirst] = useState(() => {
    const saved = localStorage.getItem('showFrontFirst');
    return saved ? JSON.parse(saved) : true;
  });

  const [spellMode, setSpellMode] = useState(() => {
    const saved = localStorage.getItem('spellMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('autoPlay', JSON.stringify(autoPlay));
  }, [autoPlay]);

  useEffect(() => {
    localStorage.setItem('showFrontFirst', JSON.stringify(showFrontFirst));
  }, [showFrontFirst]);

  useEffect(() => {
    localStorage.setItem('spellMode', JSON.stringify(spellMode));
  }, [spellMode]);

  return (
    <SettingsContext.Provider
      value={{
        autoPlay,
        setAutoPlay,
        showFrontFirst,
        setShowFrontFirst,
        spellMode,
        setSpellMode,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}