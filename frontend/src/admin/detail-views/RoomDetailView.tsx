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
  setSelectedRoom
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({ ...selectedRoom });
  const [zones, setZones] = useState<any[]>([]);
  const [zoneSearch, setZoneSearch] = useState('');
  const [filteredZones, setFilteredZones] = useState<any[]>([]);
  const [terrains, setTerrains] = useState<any[]>([]);
  const [roomFlags, setRoomFlags] = useState<any[]>([]);

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

  const handleEditClick = () => {
    setIsEditing(true);
    setEditFormData({ ...selectedRoom });
  };

  const handleSave = async () => {
    try {
      // Only send the fields that can be edited
      const dataToSend = {
        name: editFormData.name,
        description: editFormData.description,
        terrain: editFormData.terrain,
        flags: editFormData.flags,
        zone_id: editFormData.zone_id
      };

      console.log('Sending data:', dataToSend);
      await api.put(`/rooms/${selectedRoom.id}`, dataToSend);
      
      // Update the local selectedRoom with the edited data
      if (setSelectedRoom) {
        setSelectedRoom({ ...selectedRoom, ...dataToSend });
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
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const selectZone = (selectedZone: any) => {
    handleFieldChange('zone_id', selectedZone.id);
    setZoneSearch(selectedZone.name);
    setFilteredZones([]);
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
              <select
                value={editFormData.flags || ''}
                onChange={(e) => handleFieldChange('flags', e.target.value || undefined)}
                className="inline-edit-input"
              >
                <option value="">Select Flag</option>
                {roomFlags.map(flag => (
                  <option key={flag.id} value={flag.value}>
                    {flag.value}
                  </option>
                ))}
              </select>
            ) : (
              <span>{selectedRoom.flags || '—'}</span>
            )}
          </div>
        </div>
      </div>

      <div className="room-exits-section">
        <h4>Exits</h4>
        {exits.length === 0 ? (
          <p className="empty-message">No exits from this room.</p>
        ) : (
          <div className="entity-table-container">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Destination</th>
                  <th>Exit Description</th>
                  <th>Look Description</th>
                  <th>Door</th>
                  <th>Door Description</th>
                  <th>Locked</th>
                </tr>
              </thead>
              <tbody>
                {exits.map(exit => (
                  <tr key={exit.id}>
                    <td>{exit.direction}</td>
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
                    <td>{exit.exit_description || exit.description || '—'}</td>
                    <td>
                      {exit.look_description ? (
                        <span className="text-muted">{exit.look_description}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {exit.is_door ? (
                        <>
                          {exit.door_name || 'Door'}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{exit.door_description || '—'}</td>
                    <td>
                      {exit.is_door ? (
                        exit.is_locked ? '🔒 Yes' : '🔓 No'
                      ) : (
                        '—'
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