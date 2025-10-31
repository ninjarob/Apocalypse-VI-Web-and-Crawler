import React from 'react';
import { Entity } from '../types';

interface SpellDetailViewProps {
  selectedSpell: Entity;
  handleBackToSpells: () => void;
}

export const SpellDetailView: React.FC<SpellDetailViewProps> = ({
  selectedSpell,
  handleBackToSpells
}) => {
  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="btn-back" onClick={handleBackToSpells}>
          ← Back to Spells
        </button>
        <h3>{selectedSpell.name}</h3>
      </div>

      <div className="detail-section">
        <h4>Spell Information</h4>
        <div className="detail-grid">
          {selectedSpell.type && (
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                <span className="tag">{selectedSpell.type}</span>
              </span>
            </div>
          )}
          {selectedSpell.level !== undefined && (
            <div className="detail-item">
              <span className="detail-label">Level:</span>
              <span className="detail-value">{selectedSpell.level}</span>
            </div>
          )}
          {selectedSpell.manaCost !== undefined && (
            <div className="detail-item">
              <span className="detail-label">Mana Cost:</span>
              <span className="detail-value">{selectedSpell.manaCost}</span>
            </div>
          )}
        </div>

        {selectedSpell.description && (
          <div className="detail-item full-width" style={{ marginTop: '15px' }}>
            <span className="detail-label">Description:</span>
            <div className="detail-description">{selectedSpell.description}</div>
          </div>
        )}
      </div>

      {selectedSpell.effects && Array.isArray(JSON.parse(selectedSpell.effects || '[]')) && JSON.parse(selectedSpell.effects || '[]').length > 0 && (
        <div className="detail-section">
          <h4>Effects</h4>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            {JSON.parse(selectedSpell.effects).map((effect: string, index: number) => (
              <li key={index} style={{ marginBottom: '8px' }}>
                {effect}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedSpell.rawText && (
        <div className="detail-section">
          <h4>Raw MUD Text</h4>
          <pre className="raw-text">{selectedSpell.rawText}</pre>
        </div>
      )}
    </div>
  );
};