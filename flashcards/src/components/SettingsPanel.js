import React from 'react';
import { useSettings } from '../SettingsContext';
import './SettingsPanel.css';

function SettingsPanel() {
  const { autoPlay, setAutoPlay, showSpanishFirst, setShowSpanishFirst } = useSettings();

  return (
    <div className="settings-panel">
      <div className="setting-item">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="setting-label">Auto-play audio</span>
      </div>

      <div className="setting-item">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={showSpanishFirst}
            onChange={(e) => setShowSpanishFirst(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="setting-label">Spanish first</span>
      </div>
    </div>
  );
}

export default SettingsPanel;