import React, { useState, useEffect } from 'react';
import { Room } from '../../../shared/types';
import { api } from '../api';

interface RoomFormProps {
  room?: Room;
  onSave: (room: Partial<Room>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function RoomForm({ room, onSave, onCancel, isLoading = false }: RoomFormProps) {
  const [formData, setFormData] = useState<Partial<Room>>({
    name: '',
    description: '',
    zone_id: undefined,
    vnum: undefined,
    area: '',
    flags: '',
    terrain: '',
    portal_key: '',
    greater_binding_key: '',
    zone_exit: false,
    coordinates: { x: 0, y: 0, z: 0 },
    exits: [],
    npcs: [],
    items: [],
    ...room
  });

  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);

  const [zones, setZones] = useState<any[]>([]);
  const [zoneSearch, setZoneSearch] = useState('');
  const [filteredZones, setFilteredZones] = useState<any[]>([]);
  const [terrains, setTerrains] = useState<any[]>([]);
  const [roomFlags, setRoomFlags] = useState<any[]>([]);

  const loadZones = async () => {
    try {
      const zonesData = await api.getAll('zones');
      setZones(zonesData);
    } catch (error) {
      console.error('Failed to load zones:', error);
    }
  };

  const loadTerrains = async () => {
    try {
      const terrainsData = await api.getAll('room_terrains');
      setTerrains(terrainsData);
    } catch (error) {
      console.error('Failed to load terrains:', error);
    }
  };

  const loadRoomFlags = async () => {
    try {
      const flagsData = await api.getAll('room_flags');
      setRoomFlags(flagsData);
    } catch (error) {
      console.error('Failed to load room flags:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCoordinateChange = (axis: 'x' | 'y' | 'z', value: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: {
        x: prev.coordinates?.x ?? 0,
        y: prev.coordinates?.y ?? 0,
        z: prev.coordinates?.z ?? 0,
        [axis]: value
      }
    }));
  };

  const selectZone = (selectedZone: any) => {
    handleInputChange('zone_id', selectedZone.id);
    setZoneSearch(selectedZone.name);
    setFilteredZones([]);
  };

  const addFlag = (flagValue: string) => {
    if (!selectedFlags.includes(flagValue)) {
      setSelectedFlags(prev => [...prev, flagValue]);
    }
  };

  const removeFlag = (flagValue: string) => {
    setSelectedFlags(prev => prev.filter(f => f !== flagValue));
  };

  useEffect(() => {
    loadZones();
    loadTerrains();
    loadRoomFlags();
    // Initialize selected flags from room data (always initialize to ensure edit mode works)
    setSelectedFlags(room?.flags ? room.flags.split(',').map(f => f.trim()).filter(f => f) : []);
  }, [room]);

  useEffect(() => {
    if (zoneSearch.trim()) {
      const filtered = zones.filter(z =>
        z.name.toLowerCase().includes(zoneSearch.toLowerCase()) ||
        z.id.toString().includes(zoneSearch)
      );
      setFilteredZones(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredZones([]);
    }
  }, [zoneSearch, zones]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      flags: selectedFlags.join(',')
    };

    onSave(submitData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content room-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{room ? 'Edit Room' : 'Add Room'}</h2>
          <button className="close-button" onClick={onCancel}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="room-form">
          <div className="form-grid">
            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>

              <div className="form-group">
                <label htmlFor="zone_id">Zone</label>
                <div className="zone-lookup">
                  <input
                    type="text"
                    id="zone_id"
                    value={zoneSearch || (formData.zone_id ? zones.find(z => z.id === formData.zone_id)?.name || '' : '')}
                    onChange={(e) => {
                      setZoneSearch(e.target.value);
                      if (!e.target.value) {
                        handleInputChange('zone_id', undefined);
                      }
                    }}
                    placeholder="Search zones..."
                  />
                  {filteredZones.length > 0 && (
                    <div className="zone-suggestions">
                      {filteredZones.map(zone => (
                        <div
                          key={zone.id}
                          className="zone-suggestion"
                          onClick={() => selectZone(zone)}
                        >
                          {zone.name} (ID: {zone.id})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  maxLength={255}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="area">Area</label>
                  <input
                    type="text"
                    id="area"
                    value={formData.area || ''}
                    onChange={(e) => handleInputChange('area', e.target.value)}
                    maxLength={255}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="terrain">Terrain</label>
                  <select
                    id="terrain"
                    value={formData.terrain || ''}
                    onChange={(e) => handleInputChange('terrain', e.target.value || undefined)}
                  >
                    <option value="">Select Terrain</option>
                    {terrains.map(terrain => (
                      <option key={terrain.id} value={terrain.value}>
                        {terrain.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="flags">Flags</label>
                {selectedFlags.length > 0 && (
                  <div className="selected-flags">
                    {selectedFlags.map(flag => (
                      <div key={flag} className="flag-card">
                        <span>{flag}</span>
                        <button
                          type="button"
                          className="flag-remove"
                          onClick={() => removeFlag(flag)}
                          title={`Remove ${flag} flag`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <select
                  id="flags"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addFlag(e.target.value);
                    }
                  }}
                >
                  <option value="">Select Flag to Add</option>
                  {roomFlags
                    .filter(flag => !selectedFlags.includes(flag.value))
                    .map(flag => (
                      <option key={flag.id} value={flag.value}>
                        {flag.value}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    id="zone_exit"
                    checked={formData.zone_exit || false}
                    onChange={(e) => handleInputChange('zone_exit', e.target.checked)}
                  />
                  Zone Exit
                </label>
              </div>
            </div>

            {/* Portal Keys */}
            <div className="form-section">
              <h3>Portal Keys</h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="portal_key">Lesser Binding Key</label>
                  <input
                    type="text"
                    id="portal_key"
                    value={formData.portal_key || ''}
                    onChange={(e) => handleInputChange('portal_key', e.target.value)}
                    maxLength={100}
                    placeholder="7-letter key from 'bind portal minor'"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="greater_binding_key">Greater Binding Key</label>
                  <input
                    type="text"
                    id="greater_binding_key"
                    value={formData.greater_binding_key || ''}
                    onChange={(e) => handleInputChange('greater_binding_key', e.target.value)}
                    maxLength={100}
                    placeholder="Key from 'bind portal greater' spell"
                  />
                </div>
              </div>
            </div>

            {/* Coordinates */}
            <div className="form-section">
              <h3>Coordinates</h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="coord_x">X</label>
                  <input
                    type="number"
                    id="coord_x"
                    value={formData.coordinates?.x || 0}
                    onChange={(e) => handleCoordinateChange('x', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="coord_y">Y</label>
                  <input
                    type="number"
                    id="coord_y"
                    value={formData.coordinates?.y || 0}
                    onChange={(e) => handleCoordinateChange('y', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="coord_z">Z</label>
                  <input
                    type="number"
                    id="coord_z"
                    value={formData.coordinates?.z || 0}
                    onChange={(e) => handleCoordinateChange('z', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isLoading}>
              {isLoading ? 'Saving...' : (room ? 'Update Room' : 'Create Room')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}