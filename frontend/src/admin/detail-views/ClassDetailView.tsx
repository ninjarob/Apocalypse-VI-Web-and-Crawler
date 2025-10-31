import React from 'react';
import { Entity } from '../types';

interface ClassDetailViewProps {
  selectedClass: Entity;
  handleBackToClasses: () => void;
  classProficiencies: any[];
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({
  selectedClass,
  handleBackToClasses,
  classProficiencies
}) => {
  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="btn-back" onClick={handleBackToClasses}>
          ← Back to Classes
        </button>
        <h3>{selectedClass.name}</h3>
      </div>

      <div className="detail-section">
        <h4>Class Information</h4>
        <div className="detail-grid">
          {selectedClass.alignment_requirement && (
            <div className="detail-item">
              <span className="detail-label">Alignment:</span>
              <span className="detail-value">{selectedClass.alignment_requirement}</span>
            </div>
          )}
          {selectedClass.hp_regen !== undefined && (
            <div className="detail-item">
              <span className="detail-label">HP Regen:</span>
              <span className="detail-value">{selectedClass.hp_regen}</span>
            </div>
          )}
          {selectedClass.mana_regen !== undefined && (
            <div className="detail-item">
              <span className="detail-label">Mana Regen:</span>
              <span className="detail-value">{selectedClass.mana_regen}</span>
            </div>
          )}
          {selectedClass.move_regen !== undefined && (
            <div className="detail-item">
              <span className="detail-label">Move Regen:</span>
              <span className="detail-value">{selectedClass.move_regen}</span>
            </div>
          )}
        </div>

        {selectedClass.description && (
          <div className="detail-item full-width" style={{ marginTop: '15px' }}>
            <span className="detail-label">Description:</span>
            <div className="detail-description">{selectedClass.description}</div>
          </div>
        )}

        {selectedClass.special_notes && (
          <div className="detail-item full-width" style={{ marginTop: '15px' }}>
            <span className="detail-label">Special Notes:</span>
            <div className="detail-description">{selectedClass.special_notes}</div>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h4>Class Proficiencies ({classProficiencies.length})</h4>
        {classProficiencies.length === 0 ? (
          <p className="empty-message">No proficiencies found for this class.</p>
        ) : (
          <div className="entity-table-container">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Prerequisite</th>
                </tr>
              </thead>
              <tbody>
                {classProficiencies.map(prof => (
                  <tr key={prof.id}>
                    <td><strong>{prof.level_required}</strong></td>
                    <td>{prof.name}</td>
                    <td>
                      <span className={`tag ${prof.is_skill ? 'skill' : 'spell'}`}>
                        {prof.is_skill ? 'Skill' : 'Spell'}
                      </span>
                    </td>
                    <td>
                      {prof.prerequisite_id ? (
                        (() => {
                          const prereq = classProficiencies.find(p => p.id === prof.prerequisite_id);
                          return prereq ? prereq.name : `ID ${prof.prerequisite_id}`;
                        })()
                      ) : (
                        <em className="text-gray">None</em>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};