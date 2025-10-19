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

  useEffect(() => {
    localStorage.setItem('autoPlay', JSON.stringify(autoPlay));
  }, [autoPlay]);

  useEffect(() => {
    localStorage.setItem('showFrontFirst', JSON.stringify(showFrontFirst));
  }, [showFrontFirst]);

  return (
    <SettingsContext.Provider
      value={{
        autoPlay,
        setAutoPlay,
        showFrontFirst,
        setShowFrontFirst,
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