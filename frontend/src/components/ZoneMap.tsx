import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Loading } from './Loading';

interface Room {
  id: number;
  name: string;
  zone_id?: number;
  coordinates?: { x: number; y: number; z: number };
  description?: string;
  terrain?: string;
  flags?: string;
  zone_exit?: boolean;
}

interface RoomExit {
  id: number;
  from_room_id: number;
  to_room_id?: number;
  direction: string;
  description?: string;
}

interface Zone {
  id: number;
  name: string;
}

interface ZoneMapProps {
  onRoomClick?: (room: Room) => void;
}

export const ZoneMap: React.FC<ZoneMapProps> = ({ onRoomClick }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [exits, setExits] = useState<RoomExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [zLevels, setZLevels] = useState<number[]>([]);
  const [selectedZLevel, setSelectedZLevel] = useState<number>(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Load zones on component mount
  useEffect(() => {
    const loadZones = async () => {
      try {
        const zonesData = await api.getAll('zones') as Zone[];
        setZones(zonesData);
        // Auto-select first zone if available
        if (zonesData.length > 0) {
          setSelectedZoneId(zonesData[0].id);
        }
      } catch (error) {
        console.error('Failed to load zones:', error);
      }
    };
    loadZones();
  }, []);

  // Load rooms and exits when zone changes
  useEffect(() => {
    if (!selectedZoneId) return;

    const loadZoneData = async () => {
      setLoading(true);
      try {
        // Load rooms for selected zone
        const roomsData = await api.getAll('rooms') as Room[];
        const zoneRooms = roomsData.filter((room: Room) => room.zone_id === selectedZoneId);
        setRooms(zoneRooms);

        // Load exits for these rooms
        const exitsData = await api.getAll('room_exits') as RoomExit[];
        const roomIds = zoneRooms.map((r: Room) => r.id);
        const zoneExits = exitsData.filter((exit: RoomExit) =>
          roomIds.includes(exit.from_room_id) && (!exit.to_room_id || roomIds.includes(exit.to_room_id))
        );
        setExits(zoneExits);

        // Determine z-levels
        const uniqueZLevels = [...new Set(zoneRooms.map((r: Room) => r.coordinates?.z || 0))].sort((a, b) => a - b);
        setZLevels(uniqueZLevels);
        setSelectedZLevel(uniqueZLevels[0] || 0);

      } catch (error) {
        console.error('Failed to load zone data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadZoneData();
  }, [selectedZoneId]);

  // Calculate positions for rooms on current z-level
  const getRoomPositions = () => {
    const currentZRooms = rooms.filter(room => (room.coordinates?.z || 0) === selectedZLevel);

    if (currentZRooms.length === 0) return {};

    // Find bounds
    const coords = currentZRooms.map(r => r.coordinates).filter(Boolean);
    const minX = Math.min(...coords.map(c => c!.x));
    const minY = Math.min(...coords.map(c => c!.y));

    const gridSize = 120; // pixels per grid unit
    const padding = 40;

    const positions: { [key: number]: { left: number; top: number } } = {};

    currentZRooms.forEach(room => {
      if (room.coordinates) {
        const relativeX = room.coordinates.x - minX;
        const relativeY = room.coordinates.y - minY;

        positions[room.id] = {
          left: relativeX * gridSize + padding,
          top: relativeY * gridSize + padding
        };
      }
    });

    return positions;
  };

  const roomPositions = getRoomPositions();
  const currentZRooms = rooms.filter(room => (room.coordinates?.z || 0) === selectedZLevel);

  if (loading && zones.length === 0) {
    return <Loading />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px', border: '1px solid #444', borderRadius: '8px', backgroundColor: '#1a1a1a' }}>

      {/* Zone Selection Dropdown - Upper Right */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10
      }}>
        <select
          value={selectedZoneId || ''}
          onChange={(e) => setSelectedZoneId(Number(e.target.value))}
          style={{
            backgroundColor: '#2a2a2a',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          {zones.map(zone => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>

      {/* Z-Level Selector - Upper Left */}
      {zLevels.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 10,
          display: 'flex',
          gap: '5px'
        }}>
          {zLevels.map(z => (
            <button
              key={z}
              onClick={() => setSelectedZLevel(z)}
              style={{
                backgroundColor: selectedZLevel === z ? '#4fc3f7' : '#2a2a2a',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Z: {z}
            </button>
          ))}
        </div>
      )}

      {/* Map Content */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: '60px 20px 20px 20px' // Space for controls
      }}>

        {loading ? (
          <Loading />
        ) : currentZRooms.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#666'
          }}>
            No rooms found in this zone at Z-level {selectedZLevel}
          </div>
        ) : (
          <>
            {/* Exit Lines */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1
              }}
            >
              {exits.map(exit => {
                const fromRoom = currentZRooms.find(r => r.id === exit.from_room_id);
                const toRoom = currentZRooms.find(r => r.id === exit.to_room_id);

                if (!fromRoom || !toRoom || !roomPositions[fromRoom.id] || !roomPositions[toRoom.id]) {
                  return null;
                }

                const fromPos = roomPositions[fromRoom.id];
                const toPos = roomPositions[toRoom.id];

                // Calculate center points of rooms (assuming 100x60 room size)
                const fromCenterX = fromPos.left + 50;
                const fromCenterY = fromPos.top + 30;
                const toCenterX = toPos.left + 50;
                const toCenterY = toPos.top + 30;

                return (
                  <line
                    key={exit.id}
                    x1={fromCenterX}
                    y1={fromCenterY}
                    x2={toCenterX}
                    y2={toCenterY}
                    stroke="#666"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#666"
                  />
                </marker>
              </defs>
            </svg>

            {/* Room Nodes */}
            {currentZRooms.map(room => {
              const position = roomPositions[room.id];
              if (!position) return null;

              return (
                <div
                  key={room.id}
                  onClick={() => {
                    if (onRoomClick) {
                      onRoomClick(room);
                    } else {
                      setSelectedRoom(room);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: position.left,
                    top: position.top,
                    width: '100px',
                    height: '60px',
                    backgroundColor: '#2a2a2a',
                    border: '2px solid #4fc3f7',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#fff',
                    zIndex: 2,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3a3a3a';
                    e.currentTarget.style.borderColor = '#81c784';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                    e.currentTarget.style.borderColor = '#4fc3f7';
                  }}
                  title={`${room.name}\n${room.description || ''}`}
                >
                  <div style={{ padding: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {room.name}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedRoom(null)}
        >
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto',
              color: '#fff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#4fc3f7' }}>{selectedRoom.name}</h3>
              <button
                onClick={() => setSelectedRoom(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0'
                }}
              >
                ×
              </button>
            </div>

            {selectedRoom.description && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Description:</strong>
                <p style={{ margin: '5px 0', color: '#ccc' }}>{selectedRoom.description}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              {selectedRoom.terrain && (
                <div>
                  <strong>Terrain:</strong> {selectedRoom.terrain}
                </div>
              )}
              {selectedRoom.flags && (
                <div>
                  <strong>Flags:</strong> {selectedRoom.flags}
                </div>
              )}
              {selectedRoom.coordinates && (
                <div>
                  <strong>Coordinates:</strong> ({selectedRoom.coordinates.x}, {selectedRoom.coordinates.y}, {selectedRoom.coordinates.z})
                </div>
              )}
              {selectedRoom.zone_exit && (
                <div>
                  <strong>Zone Exit:</strong> Yes
                </div>
              )}
            </div>

            {/* Exits for this room */}
            {exits.filter(exit => exit.from_room_id === selectedRoom.id).length > 0 && (
              <div>
                <strong>Exits:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {exits
                    .filter(exit => exit.from_room_id === selectedRoom.id)
                    .map(exit => (
                      <li key={exit.id} style={{ color: '#ccc' }}>
                        {exit.direction}
                        {exit.description && ` - ${exit.description}`}
                        {exit.to_room_id && rooms.find(r => r.id === exit.to_room_id) && (
                          <span style={{ color: '#4fc3f7' }}>
                            {' '}→ {rooms.find(r => r.id === exit.to_room_id)?.name}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};