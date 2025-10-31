import React from 'react';
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
  handleZoneClick
}) => {
  return (
    <div className="room-detail-view">
      <div className="room-detail-header">
        <button className="btn-back" onClick={handleBackToRooms}>
          ← Back to Rooms
        </button>
        <h3>Room: {selectedRoom.name}</h3>
      </div>

      <div className="room-detail-info">
        <p>
          <strong>Description:</strong> {selectedRoom.description}
        </p>
        {selectedRoom.terrain && (
          <p>
            <strong>Terrain:</strong> {selectedRoom.terrain}
          </p>
        )}
        {selectedRoom.flags && (
          <p>
            <strong>Flags:</strong> {selectedRoom.flags}
          </p>
        )}
        {selectedRoom.zone_id && (
          <p>
            <strong>Zone:</strong>{' '}
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
                    setTimeout(() => handleZoneClick(zone), 100);
                  }
                }
              }}
            >
              {allZones.find(z => z.id === selectedRoom.zone_id)?.name || selectedRoom.zone_id}
            </a>
          </p>
        )}
      </div>

      <div className="room-exits-section">
        <h4>Exits</h4>
        {(() => {
          const exits = roomExits.filter(exit => exit.from_room_id === selectedRoom.id);
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
          exits.sort(
            (a, b) => (directionOrder[a.direction] || 99) - (directionOrder[b.direction] || 99)
          );

          if (exits.length === 0) {
            return <p className="empty-message">No exits from this room.</p>;
          }

          return (
            <div className="entity-table-container">
              <table className="entity-table">
                <thead>
                  <tr>
                    <th>Direction</th>
                    <th>Destination</th>
                    <th>Description</th>
                    <th>Door</th>
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
                      <td>{exit.description || '—'}</td>
                      <td>
                        {exit.is_door ? (
                          <>
                            {exit.door_name || 'Door'}
                            {exit.is_locked ? ' (locked)' : ''}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
};