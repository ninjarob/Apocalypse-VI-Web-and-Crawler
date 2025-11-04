import React, { useState, useEffect } from 'react';
import { Room, RoomExit } from '../../../shared/types';
import { api } from '../api';

interface RoomFormProps {
  room?: Room;
  onSave: (room: Partial<Room>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface ExitFormData {
  direction: string;
  description?: string;
  exit_description?: string;
  door_name?: string;
  door_description?: string;
  look_description?: string;
  is_door?: boolean;
  is_locked?: boolean;
  to_room_id?: number;
  to_room_name?: string;
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
    coordinates: { x: 0, y: 0, z: 0 },
    exits: [],
    npcs: [],
    items: [],
    ...room
  });

  const [exits, setExits] = useState<ExitFormData[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomSearch, setRoomSearch] = useState('');
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);

  useEffect(() => {
    loadZones();
    loadRooms();
    if (room?.roomExits) {
      const exitData = room.roomExits.map(exit => ({
        direction: exit.direction || '',
        description: exit.description || '',
        exit_description: exit.exit_description || '',
        door_name: exit.door_name || '',
        door_description: exit.door_description || '',
        look_description: exit.look_description || '',
        is_door: exit.is_door || false,
        is_locked: exit.is_locked || false,
        to_room_id: exit.to_room_id,
        to_room_name: exit.to_room_id ? getRoomName(exit.to_room_id) : ''
      }));
      setExits(exitData);
    }
  }, [room]);

  useEffect(() => {
    if (roomSearch.trim()) {
      const filtered = rooms.filter(r =>
        r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
        r.id.toString().includes(roomSearch)
      );
      setFilteredRooms(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredRooms([]);
    }
  }, [roomSearch, rooms]);

  const loadZones = async () => {
    try {
      const zonesData = await api.getAll('zones');
      setZones(zonesData);
    } catch (error) {
      console.error('Failed to load zones:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const roomsData = await api.getAll<Room>('rooms');
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const getRoomName = (roomId: number): string => {
    const foundRoom = rooms.find(r => r.id === roomId);
    return foundRoom ? foundRoom.name : `Room ${roomId}`;
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

  const addExit = () => {
    setExits(prev => [...prev, {
      direction: '',
      description: '',
      exit_description: '',
      door_name: '',
      door_description: '',
      look_description: '',
      is_door: false,
      is_locked: false,
      to_room_id: undefined,
      to_room_name: ''
    }]);
  };

  const updateExit = (index: number, field: string, value: any) => {
    setExits(prev => prev.map((exit, i) =>
      i === index ? { ...exit, [field]: value } : exit
    ));
  };

  const removeExit = (index: number) => {
    setExits(prev => prev.filter((_, i) => i !== index));
  };

  const selectRoomForExit = (exitIndex: number, selectedRoom: Room) => {
    updateExit(exitIndex, 'to_room_id', selectedRoom.id);
    updateExit(exitIndex, 'to_room_name', selectedRoom.name);
    setRoomSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert exits to the format expected by the API
    const roomExits: Partial<RoomExit>[] = exits.map(exit => ({
      direction: exit.direction,
      description: exit.description,
      exit_description: exit.exit_description,
      door_name: exit.door_name,
      door_description: exit.door_description,
      look_description: exit.look_description,
      is_door: exit.is_door,
      is_locked: exit.is_locked,
      to_room_id: exit.to_room_id,
      from_room_id: formData.id // Will be set when creating/updating
    }));

    const submitData = {
      ...formData,
      roomExits
    };

    onSave(submitData);
  };

  const directions = [
    'north', 'south', 'east', 'west',
    'northeast', 'northwest', 'southeast', 'southwest',
    'up', 'down', 'in', 'out', 'enter', 'exit'
  ];

  return (
    <div className="modal-overlay" onClick={onCancel}>
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
                  <label htmlFor="zone_id">Zone</label>
                  <select
                    id="zone_id"
                    value={formData.zone_id || ''}
                    onChange={(e) => handleInputChange('zone_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  >
                    <option value="">Select Zone</option>
                    {zones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="vnum">VNUM</label>
                  <input
                    type="number"
                    id="vnum"
                    value={formData.vnum || ''}
                    onChange={(e) => handleInputChange('vnum', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
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
                  <input
                    type="text"
                    id="terrain"
                    value={formData.terrain || ''}
                    onChange={(e) => handleInputChange('terrain', e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="flags">Flags</label>
                <input
                  type="text"
                  id="flags"
                  value={formData.flags || ''}
                  onChange={(e) => handleInputChange('flags', e.target.value)}
                  maxLength={255}
                />
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

            {/* Exits */}
            <div className="form-section">
              <div className="section-header">
                <h3>Exits</h3>
                <button type="button" className="add-button" onClick={addExit}>
                  Add Exit
                </button>
              </div>

              {exits.map((exit, index) => (
                <div key={index} className="exit-item">
                  <div className="exit-header">
                    <h4>Exit {index + 1}</h4>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => removeExit(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Direction</label>
                      <select
                        value={exit.direction}
                        onChange={(e) => updateExit(index, 'direction', e.target.value)}
                        required
                      >
                        <option value="">Select Direction</option>
                        {directions.map(dir => (
                          <option key={dir} value={dir}>{dir}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Connected Room</label>
                      <div className="room-lookup">
                        <input
                          type="text"
                          value={exit.to_room_name || ''}
                          onChange={(e) => {
                            updateExit(index, 'to_room_name', e.target.value);
                            setRoomSearch(e.target.value);
                          }}
                          placeholder="Search rooms..."
                        />
                        {filteredRooms.length > 0 && (
                          <div className="room-suggestions">
                            {filteredRooms.map(room => (
                              <div
                                key={room.id}
                                className="room-suggestion"
                                onClick={() => selectRoomForExit(index, room)}
                              >
                                {room.name} (ID: {room.id})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Description</label>
                      <input
                        type="text"
                        value={exit.description || ''}
                        onChange={(e) => updateExit(index, 'description', e.target.value)}
                        maxLength={500}
                      />
                    </div>

                    <div className="form-group">
                      <label>Exit Description</label>
                      <input
                        type="text"
                        value={exit.exit_description || ''}
                        onChange={(e) => updateExit(index, 'exit_description', e.target.value)}
                        maxLength={1000}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Door Name</label>
                      <input
                        type="text"
                        value={exit.door_name || ''}
                        onChange={(e) => updateExit(index, 'door_name', e.target.value)}
                        maxLength={100}
                      />
                    </div>

                    <div className="form-group">
                      <label>Door Description</label>
                      <input
                        type="text"
                        value={exit.door_description || ''}
                        onChange={(e) => updateExit(index, 'door_description', e.target.value)}
                        maxLength={1000}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Look Description</label>
                    <textarea
                      value={exit.look_description || ''}
                      onChange={(e) => updateExit(index, 'look_description', e.target.value)}
                      rows={2}
                      maxLength={2000}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={exit.is_door || false}
                          onChange={(e) => updateExit(index, 'is_door', e.target.checked)}
                        />
                        Is Door
                      </label>
                    </div>

                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={exit.is_locked || false}
                          onChange={(e) => updateExit(index, 'is_locked', e.target.checked)}
                        />
                        Is Locked
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              {exits.length === 0 && (
                <p className="no-exits">No exits defined. Click "Add Exit" to add one.</p>
              )}
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