import React from 'react';
import { Entity } from '../types';

interface AbilityScoresModalProps {
  showScores: boolean;
  setShowScores: (show: boolean) => void;
  selectedAbility: Entity | null;
  abilityScores: any[];
}

export const AbilityScoresModal: React.FC<AbilityScoresModalProps> = ({
  showScores,
  setShowScores,
  selectedAbility,
  abilityScores
}) => {
  if (!showScores) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowScores(false)}>
      <div className="modal-content scores-modal" onClick={e => e.stopPropagation()}>
        <h3>
          {selectedAbility?.name} ({selectedAbility?.short_name}) - Score Table
        </h3>

        {abilityScores.length === 0 ? (
          <p>No scores defined for this ability.</p>
        ) : (
          <>
            <div className="scores-table-container">
              <table className="scores-table">
                <thead>
                  <tr>
                    <th>Score</th>
                    {abilityScores[0] &&
                      Object.keys(abilityScores[0].effects).map(key => (
                        <th key={key}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {abilityScores.map(score => (
                    <tr key={score.id}>
                      <td>
                        <strong>{score.score}</strong>
                      </td>
                      {Object.values(score.effects).map((value: any, idx) => (
                        <td key={idx}>
                          {typeof value === 'number' && value > 0 ? `+${value}` : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Show class bonus table for Charisma */}
            {selectedAbility?.short_name === 'CHA' && (
              <div style={{ marginTop: '30px' }}>
                <h4>Class Bonuses</h4>
                <div className="scores-table-container">
                  <table className="scores-table">
                    <thead>
                      <tr>
                        <th>Necromancer</th>
                        <th>Mage</th>
                        <th>All Others</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>+10</strong>
                        </td>
                        <td>
                          <strong>+5</strong>
                        </td>
                        <td>
                          <strong>0</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn-secondary" onClick={() => setShowScores(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};