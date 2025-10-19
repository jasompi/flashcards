import React from 'react';
import { useSettings } from '../SettingsContext';
import './SettingsPanel.css';

function SettingsPanel() {
  const { autoPlay, setAutoPlay, showFrontFirst, setShowFrontFirst, spellMode, setSpellMode } = useSettings();

  return (
    <div className="settings-panel">
      <div className="setting-item">
        <div className="segmented-control">
          <button
            className={`segment ${showFrontFirst ? 'active' : ''}`}
            onClick={() => setShowFrontFirst(true)}
            aria-pressed={showFrontFirst}
          >
            Front
          </button>
          <button
            className={`segment ${!showFrontFirst ? 'active' : ''}`}
            onClick={() => setShowFrontFirst(false)}
            aria-pressed={!showFrontFirst}
          >
            Back
          </button>
        </div>
      </div>

      <div className="setting-item">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={spellMode}
            onChange={(e) => setSpellMode(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="setting-label">Spell Mode</span>
      </div>

      <div className="setting-item">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={spellMode || autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
            disabled={spellMode}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="setting-label">Auto-Play Audio</span>
      </div>
    </div>
  );
}

export default SettingsPanel;