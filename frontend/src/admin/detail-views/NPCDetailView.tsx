import React from 'react';
import { Entity } from '../types';

interface NPCDetailViewProps {
  selectedNPC: Entity;
  handleBackToNPCs: () => void;
}

export const NPCDetailView: React.FC<NPCDetailViewProps> = ({
  selectedNPC,
  handleBackToNPCs
}) => {
  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="btn-back" onClick={handleBackToNPCs}>
          ← Back to NPCs
        </button>
        <h3>{selectedNPC.name}</h3>
      </div>

      <div className="detail-section">
        <h4>NPC Information</h4>
        <div className="detail-grid">
          {selectedNPC.level && (
            <div className="detail-item">
              <span className="detail-label">Level:</span>
              <span className="detail-value">{selectedNPC.level}</span>
            </div>
          )}
          {selectedNPC.race && (
            <div className="detail-item">
              <span className="detail-label">Race:</span>
              <span className="detail-value">{selectedNPC.race}</span>
            </div>
          )}
          {selectedNPC.class && (
            <div className="detail-item">
              <span className="detail-label">Class:</span>
              <span className="detail-value">{selectedNPC.class}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Disposition:</span>
            <span className="detail-value">
              <span className={`tag ${selectedNPC.hostile ? 'hostile' : 'friendly'}`}>
                {selectedNPC.hostile ? 'Hostile' : 'Friendly'}
              </span>
            </span>
          </div>
          {selectedNPC.location && (
            <div className="detail-item">
              <span className="detail-label">Location:</span>
              <span className="detail-value">{selectedNPC.location}</span>
            </div>
          )}
        </div>

        {selectedNPC.description && (
          <div className="detail-item full-width" style={{ marginTop: '15px' }}>
            <span className="detail-label">Description:</span>
            <div className="detail-description">{selectedNPC.description}</div>
          </div>
        )}
      </div>

      {selectedNPC.dialogue && Array.isArray(JSON.parse(selectedNPC.dialogue || '[]')) && JSON.parse(selectedNPC.dialogue || '[]').length > 0 && (
        <div className="detail-section">
          <h4>Dialogue</h4>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            {JSON.parse(selectedNPC.dialogue).map((line: string, index: number) => (
              <li key={index} style={{ marginBottom: '8px' }}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedNPC.rawText && (
        <div className="detail-section">
          <h4>Raw MUD Text</h4>
          <pre className="raw-text">{selectedNPC.rawText}</pre>
        </div>
      )}
    </div>
  );
};