import React from 'react';
import { Entity } from '../types';

interface ActionDetailViewProps {
  selectedAction: Entity;
  handleBackToActions: () => void;
}

export const ActionDetailView: React.FC<ActionDetailViewProps> = ({
  selectedAction,
  handleBackToActions
}) => {
  return (
    <div className="action-detail-view">
      <div className="action-detail-header">
        <button className="btn-back" onClick={handleBackToActions}>
          ← Back to Player Actions
        </button>
        <h3>Action: {selectedAction.name}</h3>
      </div>

      <div className="action-detail-info">
        <p>
          <strong>Type:</strong>{' '}
          <span className="action-type-badge">{selectedAction.type}</span>
        </p>
        {selectedAction.category && (
          <p>
            <strong>Category:</strong> {selectedAction.category}
          </p>
        )}
        {selectedAction.levelRequired && (
          <p>
            <strong>Level Required:</strong> {selectedAction.levelRequired}
          </p>
        )}

        {selectedAction.description && (
          <div className="action-description">
            <strong>Description:</strong>
            <pre>{selectedAction.description}</pre>
          </div>
        )}

        {selectedAction.syntax && (
          <div className="action-syntax">
            <strong>Syntax:</strong>
            <pre>{selectedAction.syntax}</pre>
          </div>
        )}

        {selectedAction.examples && (
          <div className="action-examples">
            <strong>Examples:</strong>
            <pre>{selectedAction.examples}</pre>
          </div>
        )}

        {selectedAction.requirements && (
          <p>
            <strong>Requirements:</strong> {selectedAction.requirements}
          </p>
        )}
        {selectedAction.relatedActions && (
          <p>
            <strong>Related Actions:</strong> {selectedAction.relatedActions}
          </p>
        )}
      </div>

      <div className="action-stats-section">
        <h4>Statistics</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Documented:</span>
            <span className="stat-value">{selectedAction.documented ? 'Yes' : 'No'}</span>
          </div>
          {selectedAction.discovered && (
            <div className="stat-item">
              <span className="stat-label">Discovered:</span>
              <span className="stat-value">
                {new Date(selectedAction.discovered).toLocaleDateString()}
              </span>
            </div>
          )}
          {selectedAction.lastTested && (
            <div className="stat-item">
              <span className="stat-label">Last Tested:</span>
              <span className="stat-value">
                {new Date(selectedAction.lastTested).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="stat-item">
            <span className="stat-label">Times Used:</span>
            <span className="stat-value">{selectedAction.timesUsed || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Success Count:</span>
            <span className="stat-value">{selectedAction.successCount || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Fail Count:</span>
            <span className="stat-value">{selectedAction.failCount || 0}</span>
          </div>
          {(selectedAction.successCount > 0 || selectedAction.failCount > 0) && (
            <div className="stat-item">
              <span className="stat-label">Success Rate:</span>
              <span className="stat-value">
                {(
                  (selectedAction.successCount /
                    (selectedAction.successCount + selectedAction.failCount)) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Test Results History */}
      {selectedAction.testResults && Array.isArray(selectedAction.testResults) && selectedAction.testResults.length > 0 && (
        <div className="action-test-results-section">
          <h4>Test Results History ({selectedAction.testResults.length})</h4>
          <div className="test-results-container">
            {selectedAction.testResults
              .sort((a, b) => new Date(b.tested_at).getTime() - new Date(a.tested_at).getTime())
              .map((test, index) => (
                <div key={index} className="test-result-item">
                  <div className="test-result-header">
                    <span className="test-result-timestamp">
                      {new Date(test.tested_at).toLocaleString()}
                    </span>
                    <span className="test-result-character">
                      {test.tested_by_character} ({test.character_class})
                    </span>
                  </div>
                  <div className="test-result-output">
                    <pre className="test-output">{test.command_result}</pre>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};