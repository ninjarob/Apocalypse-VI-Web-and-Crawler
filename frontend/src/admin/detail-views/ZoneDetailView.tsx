import React from 'react';
import { Entity } from '../types';
import { RoomsList } from './RoomsList';

interface ZoneDetailViewProps {
  selectedZone: Entity;
  handleBackToZones: () => void;
  zoneRooms: Entity[];
  handleRoomClick: (room: Entity) => void;
  onAddRoom?: () => void;
}

export const ZoneDetailView: React.FC<ZoneDetailViewProps> = ({
  selectedZone,
  handleBackToZones,
  zoneRooms,
  handleRoomClick,
  onAddRoom
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4>Rooms in this Zone ({zoneRooms.length})</h4>
          {onAddRoom && (
            <button className="btn-primary" onClick={onAddRoom}>
              Add Room
            </button>
          )}
        </div>
        <RoomsList
          rooms={zoneRooms}
          handleRoomClick={handleRoomClick}
          emptyMessage="No rooms found in this zone."
          showZoneColumn={false}
        />
      </div>
    </div>
  );
};