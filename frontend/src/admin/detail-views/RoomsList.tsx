import React from 'react';
import { Entity, EntityConfig } from '../types';

interface RoomsListProps {
  rooms: Entity[];
  handleRoomClick: (room: Entity) => void;
  emptyMessage?: string;
  allZones?: Entity[];
  ENTITY_CONFIGS?: EntityConfig[];
  setSelectedEntity?: (config: EntityConfig) => void;
  handleZoneClick?: (zone: Entity) => void;
  showZoneColumn?: boolean;
  handleDelete?: (id: number) => void;
}

/**
 * Reusable component for displaying a list of rooms with their exits
 * Used by both ZoneDetailView and the main Rooms entity list
 */
export const RoomsList: React.FC<RoomsListProps> = ({
  rooms,
  handleRoomClick,
  emptyMessage = 'No rooms found.',
  allZones = [],
  ENTITY_CONFIGS = [],
  setSelectedEntity,
  handleZoneClick,
  showZoneColumn = true,
  handleDelete
}) => {
  if (rooms.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

  return (
    <div className="entity-table-container">
      <table className="entity-table">
        <thead>
          <tr>
            <th>Name</th>
            {showZoneColumn && <th>Zone</th>}
            {handleDelete && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => {
            return (
              <tr
                key={room.id}
                className="clickable-row"
                onClick={() => handleRoomClick(room)}
              >
                <td>{room.name}</td>
                {showZoneColumn && (
                  <td>
                    {room.zone_id ? (
                      <a
                        href="#"
                        className="zone-link"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation(); // Prevent event bubbling to row click
                          const zone = allZones.find(z => z.id === room.zone_id);
                          if (zone && handleZoneClick && setSelectedEntity && ENTITY_CONFIGS) {
                            const zonesConfig = ENTITY_CONFIGS.find(c => c.endpoint === 'zones');
                            if (zonesConfig) {
                              setSelectedEntity(zonesConfig);
                              setTimeout(() => handleZoneClick(zone), 100);
                            }
                          }
                        }}
                      >
                        {allZones.find(z => z.id === room.zone_id)?.name || `Zone ${room.zone_id}`}
                      </a>
                    ) : (
                      <em className="text-gray">No zone</em>
                    )}
                  </td>
                )}
                {handleDelete && (
                  <td className="actions-cell" onClick={e => e.stopPropagation()}>
                    <button
                      className="btn-small btn-delete"
                      onClick={() => handleDelete(room.id)}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
