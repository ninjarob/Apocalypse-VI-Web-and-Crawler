import React from 'react';
import { Entity, EntityConfig } from '../types';

interface EditFormModalProps {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editingEntity: Entity | null;
  formData: any;
  selectedEntity: EntityConfig;
  handleSubmit: (e: React.FormEvent) => void;
  handleFieldChange: (fieldName: string, value: any) => void;
}

export const EditFormModal: React.FC<EditFormModalProps> = ({
  showForm,
  setShowForm,
  editingEntity,
  formData,
  selectedEntity,
  handleSubmit,
  handleFieldChange
}) => {
  if (!showForm) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowForm(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>
          {editingEntity ? 'Edit' : 'Create'} {getSingularName(selectedEntity.name)}
        </h3>

        <form onSubmit={handleSubmit}>
          {selectedEntity.fields.map(field => (
            <div key={field.name} className="form-group">
              <label>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                  rows={4}
                />
              ) : field.type === 'json' ? (
                <textarea
                  value={
                    typeof formData[field.name] === 'string'
                      ? formData[field.name]
                      : JSON.stringify(formData[field.name], null, 2) || ''
                  }
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  placeholder='{"key": "value"} or ["item1", "item2"]'
                  rows={4}
                  className="json-input"
                />
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  required={field.required}
                />
              )}
            </div>
          ))}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingEntity ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function to singularize entity names
function getSingularName(pluralName: string): string {
  if (pluralName.endsWith('ies')) {
    return pluralName.slice(0, -3) + 'y';
  }
  if (pluralName.endsWith('sses') || pluralName.endsWith('xes')) {
    return pluralName.slice(0, -2);
  }
  if (pluralName.endsWith('s')) {
    return pluralName.slice(0, -1);
  }
  return pluralName;
}