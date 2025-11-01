import React from 'react';
import { Entity } from '../types';

interface RoomsListProps {
  rooms: Entity[];
  roomExits: any[];
  handleRoomClick: (room: Entity) => void;
  emptyMessage?: string;
}

/**
 * Reusable component for displaying a list of rooms with their exits
 * Used by both ZoneDetailView and the main Rooms entity list
 */
export const RoomsList: React.FC<RoomsListProps> = ({
  rooms,
  roomExits,
  handleRoomClick,
  emptyMessage = 'No rooms found.'
}) => {
  if (rooms.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

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

  return (
    <div className="entity-table-container">
      <table className="entity-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Exits</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => {
            const exits = roomExits.filter(exit => exit.from_room_id === room.id);
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
                        const toRoom = rooms.find(r => r.id === exit.to_room_id);
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
  );
};
