import React from 'react';
import { Entity } from '../types';

interface HelpEntryDetailViewProps {
  selectedHelpEntry: Entity;
  handleBackToHelpEntries: () => void;
}

export const HelpEntryDetailView: React.FC<HelpEntryDetailViewProps> = ({
  selectedHelpEntry,
  handleBackToHelpEntries
}) => {
  return (
    <div className="help-entry-detail-view">
      <div className="help-entry-detail-header">
        <button className="btn-back" onClick={handleBackToHelpEntries}>
          ← Back to Help Entries
        </button>
        <h3>Help Entry: {selectedHelpEntry.name}</h3>
      </div>

      <div className="help-entry-detail-info">
        <div className="help-entry-name">
          <strong>Name:</strong> {selectedHelpEntry.name}
        </div>

        {selectedHelpEntry.variations && Array.isArray(selectedHelpEntry.variations) && selectedHelpEntry.variations.length > 0 && (
          <div className="help-entry-variations">
            <strong>Variations:</strong>
            <ul>
              {selectedHelpEntry.variations.map((variation: string, index: number) => (
                <li key={index}>{variation}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="help-entry-text">
          <strong>Help Text:</strong>
          <pre className="help-text-content">{selectedHelpEntry.helpText}</pre>
        </div>
      </div>
    </div>
  );
};