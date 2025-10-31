import React from 'react';
import { Entity } from '../types';

interface ItemDetailViewProps {
  selectedItem: Entity;
  handleBackToItems: () => void;
}

export const ItemDetailView: React.FC<ItemDetailViewProps> = ({
  selectedItem,
  handleBackToItems
}) => {
  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="btn-back" onClick={handleBackToItems}>
          ← Back to Items
        </button>
        <h3>{selectedItem.name}</h3>
      </div>

      <div className="detail-section">
        <h4>Item Information</h4>
        <div className="detail-grid">
          {selectedItem.type && (
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                <span className="tag">{selectedItem.type}</span>
              </span>
            </div>
          )}
          {selectedItem.location && (
            <div className="detail-item">
              <span className="detail-label">Location:</span>
              <span className="detail-value">{selectedItem.location}</span>
            </div>
          )}
        </div>

        {selectedItem.description && (
          <div className="detail-item full-width" style={{ marginTop: '15px' }}>
            <span className="detail-label">Description:</span>
            <div className="detail-description">{selectedItem.description}</div>
          </div>
        )}
      </div>

      {selectedItem.stats && typeof selectedItem.stats === 'object' && Object.keys(selectedItem.stats).length > 0 && (
        <div className="detail-section">
          <h4>Stats</h4>
          <div className="detail-grid">
            {Object.entries(selectedItem.stats).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{key}:</span>
                <span className="detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedItem.properties && typeof selectedItem.properties === 'object' && Object.keys(selectedItem.properties).length > 0 && (
        <div className="detail-section">
          <h4>Properties</h4>
          <div className="detail-grid">
            {Object.entries(selectedItem.properties).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{key}:</span>
                <span className="detail-value">
                  {Array.isArray(value) 
                    ? value.join(', ')
                    : typeof value === 'object' 
                      ? JSON.stringify(value, null, 2) 
                      : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedItem.rawText && (
        <div className="detail-section">
          <h4>Raw MUD Text</h4>
          <pre className="raw-text">{selectedItem.rawText}</pre>
        </div>
      )}
    </div>
  );
};