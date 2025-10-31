import React from 'react';
import { Entity } from '../types';

interface ZoneDetailViewProps {
  selectedZone: Entity;
  handleBackToZones: () => void;
  zoneRooms: Entity[];
  roomExits: any[];
  handleRoomClick: (room: Entity) => void;
}

export const ZoneDetailView: React.FC<ZoneDetailViewProps> = ({
  selectedZone,
  handleBackToZones,
  zoneRooms,
  roomExits,
  handleRoomClick
}) => {
  return (
    <div className="zone-detail-view">
      <div className="zone-detail-header">
        <button className="btn-back" onClick={handleBackToZones}>
          ← Back to Zones
        </button>
        <h3>
          Zone #{selectedZone.id}: {selectedZone.name}
        </h3>
      </div>

      <div className="zone-detail-info">
        <p>
          <strong>Description:</strong> {selectedZone.description}
        </p>
        {selectedZone.author && (
          <p>
            <strong>Author:</strong> {selectedZone.author}
          </p>
        )}
        {selectedZone.difficulty && (
          <p>
            <strong>Difficulty:</strong> {'★'.repeat(selectedZone.difficulty)}
            {'☆'.repeat(5 - selectedZone.difficulty)} ({selectedZone.difficulty}/5)
          </p>
        )}
        {selectedZone.notes && (
          <p>
            <strong>Notes:</strong> {selectedZone.notes}
          </p>
        )}
      </div>

      <div className="zone-rooms-section">
        <h4>Rooms in this Zone ({zoneRooms.length})</h4>
        {zoneRooms.length === 0 ? (
          <p className="empty-message">No rooms found in this zone.</p>
        ) : (
          <div className="entity-table-container">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Exits</th>
                </tr>
              </thead>
              <tbody>
                {zoneRooms.map(room => {
                  const exits = roomExits.filter(exit => exit.from_room_id === room.id);
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
                    (a, b) =>
                      (directionOrder[a.direction] || 99) - (directionOrder[b.direction] || 99)
                  );

                  return (
                    <tr
                      key={room.id}
                      className="clickable-row"
                      onClick={() => handleRoomClick(room)}
                    >
                      <td>{room.name}</td>
                      <td>
                        {exits.length === 0 ? (
                          <em className="text-gray">No exits</em>
                        ) : (
                          <div className="room-exits">
                            {exits.map((exit, idx) => {
                              const toRoom = zoneRooms.find(r => r.id === exit.to_room_id);
                              const exitText = exit.to_room_id
                                ? `${exit.direction} → ${toRoom?.name || `Room ${exit.to_room_id}`}`
                                : `${exit.direction} (unimplemented)`;
                              return (
                                <div key={idx} className="exit-item">
                                  {exitText}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};