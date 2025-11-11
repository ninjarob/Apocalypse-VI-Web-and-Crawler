import React, { useState } from 'react';
import { Entity, EntityConfig } from '../types';
import { api } from '../../api';

interface RoomDetailViewProps {
  selectedRoom: Entity;
  handleBackToRooms: () => void;
  allZones: Entity[];
  roomExits: any[];
  allRooms: Entity[];
  setAllRooms: React.Dispatch<React.SetStateAction<Entity[]>>;
  handleRoomClick: (room: Entity) => void;
  ENTITY_CONFIGS: EntityConfig[];
  setSelectedEntity: (config: EntityConfig) => void;
  handleZoneClick: (zone: Entity) => void;
  backButtonText?: string;
  setSelectedRoom?: React.Dispatch<React.SetStateAction<Entity | null>>;
  onRoomExitsChange?: () => void;
  zoneConnections?: any[];
}

export const RoomDetailView: React.FC<RoomDetailViewProps> = ({
  selectedRoom,
  handleBackToRooms,
  allZones,
  roomExits,
  allRooms,
  setAllRooms,
  handleRoomClick,
  ENTITY_CONFIGS,
  setSelectedEntity,
  handleZoneClick,
  backButtonText = '← Back to Rooms',
  setSelectedRoom,
  onRoomExitsChange,
  zoneConnections = []
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({ ...selectedRoom });
  const [zones, setZones] = useState<any[]>([]);
  const [zoneSearch, setZoneSearch] = useState('');
  const [filteredZones, setFilteredZones] = useState<any[]>([]);
  const [terrains, setTerrains] = useState<any[]>([]);
  const [roomFlags, setRoomFlags] = useState<any[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [editExits, setEditExits] = useState<any[]>([]);
  const [exitRoomSearches, setExitRoomSearches] = useState<{[key: number]: string}>({});
  const [exitFilteredRooms, setExitFilteredRooms] = useState<{[key: number]: any[]}>({});

  // Load zones for editing
  React.useEffect(() => {
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
    loadZones();
    loadTerrains();
    loadRoomFlags();
  }, []);

  // Update edit form data when selected room changes
  React.useEffect(() => {
    setEditFormData({ ...selectedRoom });
    // Initialize selected flags from room data
    setSelectedFlags(selectedRoom.flags ? (selectedRoom.flags as string).split(',').map((f: string) => f.trim()).filter((f: string) => f) : []);
    // Clear exit room searches when switching rooms
    setExitRoomSearches({});
    setExitFilteredRooms({});
  }, [selectedRoom]);

  // Filter zones based on search
  React.useEffect(() => {
    if (zoneSearch.trim()) {
      const filtered = zones.filter((zone: any) =>
        zone.name.toLowerCase().includes(zoneSearch.toLowerCase()) ||
        zone.id.toString().includes(zoneSearch)
      );
      setFilteredZones(filtered.slice(0, 10));
    } else {
      setFilteredZones([]);
    }
  }, [zoneSearch, zones]);

  // Filter rooms based on search for each exit
  React.useEffect(() => {
    const newFilteredRooms: {[key: number]: any[]} = {};
    
    Object.entries(exitRoomSearches).forEach(([exitIndexStr, searchTerm]) => {
      const exitIndex = parseInt(exitIndexStr);
      if (searchTerm.trim()) {
        // First filter by search term
        let filtered = allRooms.filter((room: any) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          room.id.toString().includes(searchTerm)
        );
        
        // Then apply zone restrictions
        const currentRoomZoneId = selectedRoom.zone_id;
        
        if (!currentRoomZoneId) {
          // If current room has no zone, no exits allowed
          filtered = [];
        } else {
          // Get zones that connect to the current room's zone
          const connectedZoneIds = new Set<number>();
          
          // Add the current zone
          connectedZoneIds.add(currentRoomZoneId);
          
          // Add zones that connect to the current zone
          zoneConnections.forEach((connection: any) => {
            if (connection.zone_id === currentRoomZoneId) {
              connectedZoneIds.add(connection.connected_zone_id);
            } else if (connection.connected_zone_id === currentRoomZoneId) {
              connectedZoneIds.add(connection.zone_id);
            }
          });
          
          // Filter rooms to only include:
          // 1. Rooms in the same zone as the current room
          // 2. Rooms that are zone exits from connected zones
          filtered = filtered.filter((room: any) => {
            if (room.zone_id === currentRoomZoneId) {
              // Same zone - always allowed
              return true;
            }
            
            if (room.zone_exit && connectedZoneIds.has(room.zone_id)) {
              // Zone exit from a connected zone - allowed
              return true;
            }
            
            // Everything else - not allowed
            return false;
          });
        }
        
        newFilteredRooms[exitIndex] = filtered.slice(0, 10);
      } else {
        newFilteredRooms[exitIndex] = [];
      }
    });
    
    setExitFilteredRooms(newFilteredRooms);
  }, [exitRoomSearches, allRooms, selectedRoom.zone_id, zoneConnections]);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditFormData({ ...selectedRoom });
    // Initialize exits from roomExits prop
    const exitData = roomExits
      .filter(exit => exit.from_room_id === selectedRoom.id)
      .map(exit => ({
        direction: exit.direction || '',
        description: exit.description || '',
        door_name: exit.door_name || '',
        door_description: exit.door_description || '',
        look_description: exit.look_description || '',
        is_door: exit.is_door || false,
        is_locked: exit.is_locked || false,
        is_zone_exit: exit.is_zone_exit || false,
        to_room_id: exit.to_room_id,
        to_room_name: exit.to_room_id ? allRooms.find(r => r.id === exit.to_room_id)?.name || `Room ${exit.to_room_id}` : ''
      }));
    setEditExits(exitData);
  };

  const handleSave = async () => {
    try {
      // Convert exits to the format expected by the API
      const roomExits = editExits.map(exit => ({
        direction: exit.direction,
        description: exit.description,
        door_name: exit.door_name,
        door_description: exit.door_description,
        look_description: exit.look_description,
        is_door: exit.is_door,
        is_locked: exit.is_locked,
        is_zone_exit: exit.is_zone_exit,
        to_room_id: exit.to_room_id,
        from_room_id: selectedRoom.id
      }));

      // Only send the fields that can be edited
      const dataToSend = {
        name: editFormData.name,
        description: editFormData.description,
        terrain: editFormData.terrain,
        flags: selectedFlags.join(','),
        zone_id: editFormData.zone_id,
        zone_exit: editFormData.zone_exit,
        x: editFormData.x,
        y: editFormData.y,
        z: editFormData.z,
        roomExits
      };

      console.log('Sending data:', dataToSend);
      await api.put(`/rooms/${selectedRoom.id}`, dataToSend);
      
      // Update the local selectedRoom with the edited data
      if (setSelectedRoom) {
        setSelectedRoom({ ...selectedRoom, ...dataToSend });
      }

      // Notify parent to refresh room exits
      if (onRoomExitsChange) {
        onRoomExitsChange();
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save room:', error);
      alert('Failed to save room. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditFormData({ ...selectedRoom });
    setExitRoomSearches({});
    setExitFilteredRooms({});
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const selectZone = (selectedZone: any) => {
    handleFieldChange('zone_id', selectedZone.id);
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

  const addExit = () => {
    setEditExits(prev => [...prev, {
      direction: '',
      description: '',
      door_name: '',
      door_description: '',
      look_description: '',
      is_door: false,
      is_locked: false,
      is_zone_exit: false,
      to_room_id: undefined,
      to_room_name: ''
    }]);
  };

  const updateExit = (index: number, field: string, value: any) => {
    setEditExits(prev => prev.map((exit, i) =>
      i === index ? { ...exit, [field]: value } : exit
    ));
  };

  const removeExit = (index: number) => {
    setEditExits(prev => prev.filter((_, i) => i !== index));
  };

  const selectRoomForExit = (exitIndex: number, selectedRoom: any) => {
    updateExit(exitIndex, 'to_room_id', selectedRoom.id);
    updateExit(exitIndex, 'to_room_name', selectedRoom.name);
    setExitRoomSearches(prev => ({
      ...prev,
      [exitIndex]: ''
    }));
  };
  const directionOrder: { [key: string]: number } = {
    north: 1,
    northeast: 2,
    east: 3,
    southeast: 4,
    south: 5,
    southwest: 6,
    west: 7,
    northwest: 8,
    up: 9,
    down: 10
  };

  const exits = roomExits.filter(exit => exit.from_room_id === selectedRoom.id);
  exits.sort(
    (a, b) => (directionOrder[a.direction] || 99) - (directionOrder[b.direction] || 99)
  );
  return (
    <div className="room-detail-view">
      <div className="room-detail-header">
        <button className="btn-back" onClick={handleBackToRooms}>
          {backButtonText}
        </button>
        <h3>Room: {selectedRoom.name}</h3>
        <div className="room-edit-actions">
          {!isEditing ? (
            <button className="btn-edit" onClick={handleEditClick}>
              Edit Room
            </button>
          ) : (
            <>
              <button className="btn-save" onClick={handleSave}>
                Save
              </button>
              <button className="btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="room-detail-info">
        <div className="room-info-row">
          <div className="room-info-field">
            <strong>Zone:</strong>
            {isEditing ? (
              <div className="zone-lookup">
                <input
                  type="text"
                  value={zoneSearch || (editFormData.zone_id ? zones.find(z => z.id === editFormData.zone_id)?.name || '' : '')}
                  onChange={(e) => {
                    setZoneSearch(e.target.value);
                    if (!e.target.value) {
                      handleFieldChange('zone_id', undefined);
                    }
                  }}
                  placeholder="Search zones..."
                  className="inline-edit-input"
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
            ) : (
              <span>
                {selectedRoom.zone_id ? (
                  <a
                    href="#"
                    className="zone-link"
                    onClick={e => {
                      e.preventDefault();
                      const zone = allZones.find(z => z.id === selectedRoom.zone_id);
                      if (zone) {
                        const zonesConfig = ENTITY_CONFIGS.find(c => c.endpoint === 'zones');
                        if (zonesConfig) {
                          setSelectedEntity(zonesConfig);
                          setSelectedRoom && setSelectedRoom(null); // Clear selected room when navigating to zone
                          handleZoneClick(zone); // Call immediately instead of setTimeout
                        }
                      }
                    }}
                  >
                    {allZones.find(z => z.id === selectedRoom.zone_id)?.name || selectedRoom.zone_id}
                  </a>
                ) : (
                  '—'
                )}
              </span>
            )}
          </div>
        </div>

        <div className="room-info-row">
          <div className="room-info-field">
            <strong>Description:</strong>
            {isEditing ? (
              <textarea
                value={editFormData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={8}
                className="inline-edit-textarea"
              />
            ) : (
              <span>{selectedRoom.description}</span>
            )}
          </div>
        </div>

        <div className="room-info-row">
          <div className="room-info-field">
            <strong>Coordinates:</strong>
            {isEditing ? (
              <div className="coordinates-edit">
                <div className="coordinate-inputs">
                  <div className="coordinate-input">
                    <label>X:</label>
                    <input
                      type="number"
                      value={editFormData.x ?? ''}
                      onChange={(e) => handleFieldChange('x', e.target.value === '' ? undefined : parseInt(e.target.value))}
                      placeholder="East/West"
                      className="inline-edit-input coordinate-input-field"
                    />
                  </div>
                  <div className="coordinate-input">
                    <label>Y:</label>
                    <input
                      type="number"
                      value={editFormData.y ?? ''}
                      onChange={(e) => handleFieldChange('y', e.target.value === '' ? undefined : parseInt(e.target.value))}
                      placeholder="North/South"
                      className="inline-edit-input coordinate-input-field"
                    />
                  </div>
                  <div className="coordinate-input">
                    <label>Z:</label>
                    <input
                      type="number"
                      value={editFormData.z ?? ''}
                      onChange={(e) => handleFieldChange('z', e.target.value === '' ? undefined : parseInt(e.target.value))}
                      placeholder="Up/Down"
                      className="inline-edit-input coordinate-input-field"
                    />
                  </div>
                </div>
                <div className="coordinate-help">
                  north=+y, south=-y, east=+x, west=-x, up=+z, down=-z
                </div>
              </div>
            ) : (
              <span className="code">
                ({selectedRoom.x !== undefined ? `X: ${selectedRoom.x}` : 'X: —'}, {selectedRoom.y !== undefined ? `Y: ${selectedRoom.y}` : 'Y: —'}, {selectedRoom.z !== undefined ? `Z: ${selectedRoom.z}` : 'Z: —'})
              </span>
            )}
          </div>
        </div>

        <div className="room-info-row">
          <div className="room-info-field">
            <strong>Terrain:</strong>
            {isEditing ? (
              <select
                value={editFormData.terrain || ''}
                onChange={(e) => handleFieldChange('terrain', e.target.value || undefined)}
                className="inline-edit-input"
              >
                <option value="">Select Terrain</option>
                {terrains.map(terrain => (
                  <option key={terrain.id} value={terrain.value}>
                    {terrain.value}
                  </option>
                ))}
              </select>
            ) : (
              <span>{selectedRoom.terrain || '—'}</span>
            )}
          </div>

          <div className="room-info-field">
            <strong>Flags:</strong>
            {isEditing ? (
              <div className="flags-edit-container">
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
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addFlag(e.target.value);
                    }
                  }}
                  className="inline-edit-input"
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
            ) : (
              <span>{selectedRoom.flags || '—'}</span>
            )}
          </div>
        </div>

        <div className="room-info-row">
          <div className="room-info-field">
            <strong>Zone Exit:</strong>
            {isEditing ? (
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editFormData.zone_exit || false}
                    onChange={(e) => handleFieldChange('zone_exit', e.target.checked)}
                  />
                  This room is a zone exit
                </label>
              </div>
            ) : (
              <span>{selectedRoom.zone_exit ? 'Yes' : 'No'}</span>
            )}
          </div>

          <div className="room-info-field">
            <strong>Portal Key:</strong>
            <span className="code">{selectedRoom.portal_key || '—'}</span>
          </div>
        </div>
      </div>

      <div className="room-exits-section">
        <div className="section-header">
          <h4>Exits</h4>
          {isEditing && (
            <button type="button" className="add-button" onClick={addExit}>
              Add Exit
            </button>
          )}
        </div>

        {isEditing ? (
          // Exit editing interface - compact inline table
          <div className="exits-edit-container">
            {editExits.length === 0 ? (
              <div className="no-exits">
                <p>No exits defined.</p>
                <button type="button" className="add-button" onClick={addExit}>
                  Add Exit
                </button>
              </div>
            ) : (
              <div className="entity-table-container">
                <table className="entity-table exits-edit-table">
                  <thead>
                    <tr>
                      <th>Direction</th>
                      <th>Destination</th>
                      <th>Description</th>
                      <th>Door Info</th>
                      <th>Properties</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editExits.map((exit, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            value={exit.direction}
                            onChange={(e) => updateExit(index, 'direction', e.target.value)}
                            className="compact-input"
                          >
                            <option value="">Select</option>
                            {['north', 'south', 'east', 'west', 'up', 'down', 'in', 'out', 'enter', 'exit'].map(dir => (
                              <option key={dir} value={dir}>{dir}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="room-lookup compact">
                            <input
                              type="text"
                              value={exit.to_room_name || ''}
                              onChange={(e) => {
                                updateExit(index, 'to_room_name', e.target.value);
                                setExitRoomSearches(prev => ({
                                  ...prev,
                                  [index]: e.target.value
                                }));
                              }}
                              placeholder="Search rooms..."
                              className="compact-input"
                            />
                            {exitFilteredRooms[index] && exitFilteredRooms[index].length > 0 && (
                              <div className="room-suggestions compact">
                                {exitFilteredRooms[index].map(room => (
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
                        </td>
                        <td>
                          <div className="exit-description-edit">
                            <input
                              type="text"
                              value={exit.description || ''}
                              onChange={(e) => updateExit(index, 'description', e.target.value)}
                              placeholder="Exit description"
                              className="compact-input"
                            />
                            <input
                              type="text"
                              value={exit.look_description || ''}
                              onChange={(e) => updateExit(index, 'look_description', e.target.value)}
                              placeholder="Look description"
                              className="compact-input"
                            />
                          </div>
                        </td>
                        <td>
                          <div className="door-info-edit">
                            <input
                              type="text"
                              value={exit.door_name || ''}
                              onChange={(e) => updateExit(index, 'door_name', e.target.value)}
                              placeholder="Door name"
                              className="compact-input"
                              disabled={!exit.is_door}
                            />
                            <input
                              type="text"
                              value={exit.door_description || ''}
                              onChange={(e) => updateExit(index, 'door_description', e.target.value)}
                              placeholder="Door desc"
                              className="compact-input"
                              disabled={!exit.is_door}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="exit-properties-edit">
                            <label className="compact-checkbox">
                              <input
                                type="checkbox"
                                checked={exit.is_door || false}
                                onChange={(e) => updateExit(index, 'is_door', e.target.checked)}
                              />
                              Door
                            </label>
                            <label className="compact-checkbox">
                              <input
                                type="checkbox"
                                checked={exit.is_locked || false}
                                onChange={(e) => updateExit(index, 'is_locked', e.target.checked)}
                                disabled={!exit.is_door}
                              />
                              Locked
                            </label>
                            <label className="compact-checkbox">
                              <input
                                type="checkbox"
                                checked={exit.is_zone_exit || false}
                                onChange={(e) => updateExit(index, 'is_zone_exit', e.target.checked)}
                              />
                              Zone Exit
                            </label>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="remove-button compact"
                            onClick={() => removeExit(index)}
                            title="Remove exit"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="add-exit-row">
                  <button type="button" className="add-button" onClick={addExit}>
                    + Add Exit
                  </button>
                </div>
              </div>
            )}

            {/* Save button at bottom of exits section for convenience */}
            <div className="form-actions" style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #ddd' }}>
              <button className="btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          // Read-only exits display
          <>
            {exits.length === 0 ? (
              <p className="empty-message">No exits from this room.</p>
            ) : (
              <div className="entity-table-container">
                <table className="entity-table exits-table">
                  <thead>
                    <tr>
                      <th>Direction</th>
                      <th>Destination</th>
                      <th>Description</th>
                      <th>Door Info</th>
                      <th>Properties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exits.map(exit => (
                      <tr key={exit.id}>
                        <td><strong>{exit.direction}</strong></td>
                        <td>
                          {exit.to_room_id ? (
                            <a
                              href="#"
                              className="zone-link"
                              onClick={async e => {
                                e.preventDefault();
                                // First check allRooms
                                let room = allRooms.find(r => r.id === exit.to_room_id);
                                // If not found, fetch it
                                if (!room) {
                                  try {
                                    const rooms = await api.get(`/rooms?id=${exit.to_room_id}`);
                                    if (rooms && rooms.length > 0) {
                                      room = rooms[0];
                                      setAllRooms(prev => [...prev, room!]);
                                    }
                                  } catch (error) {
                                    console.error('Error loading room:', error);
                                  }
                                }
                                if (room) {
                                  handleRoomClick(room);
                                }
                              }}
                            >
                              {allRooms.find(r => r.id === exit.to_room_id)?.name ||
                                `Room ${exit.to_room_id}`}
                            </a>
                          ) : (
                            <em className="text-gray">Unimplemented</em>
                          )}
                        </td>
                        <td>
                          <div className="exit-description">
                            <div><strong>Exit:</strong> {exit.description || 'No description'}</div>
                            {exit.look_description && (
                              <div><strong>Look:</strong> <span className="text-muted">{exit.look_description}</span></div>
                            )}
                          </div>
                        </td>
                        <td>
                          {exit.is_door ? (
                            <div className="door-info">
                              <div><strong>Name:</strong> {exit.door_name || 'Door'}</div>
                              {exit.door_description && (
                                <div><strong>Desc:</strong> {exit.door_description}</div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <div className="exit-properties">
                            {exit.is_door && (
                              <div className="property-item">
                                <span className="property-label">Door:</span> {exit.is_locked ? '🔒 Locked' : '🔓 Unlocked'}
                              </div>
                            )}
                            {exit.is_zone_exit && (
                              <div className="property-item">
                                <span className="property-label">Zone Exit:</span> 🏛️ Yes
                              </div>
                            )}
                            {!exit.is_door && !exit.is_zone_exit && (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};