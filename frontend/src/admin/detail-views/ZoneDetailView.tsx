import React, { useState, useEffect } from 'react';
import { Entity } from '../types';
import { RoomsList } from './RoomsList';

interface ZoneConnection {
  id: number;
  zone_id: number;
  connected_zone_id: number;
  connection_type: string;
  description: string;
  connected_zone_name: string;
  connected_zone_description?: string;
}

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
  const [connections, setConnections] = useState<ZoneConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await fetch(`/api/zones/${selectedZone.id}/connections`);
        if (response.ok) {
          const data = await response.json();
          setConnections(data);
        }
      } catch (error) {
        console.error('Error fetching zone connections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [selectedZone.id]);
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

      <div className="zone-connections-section">
        <h4>Zone Connections ({connections.length})</h4>
        {loading ? (
          <p>Loading connections...</p>
        ) : connections.length === 0 ? (
          <p>No connections found for this zone.</p>
        ) : (
          <div className="connections-list">
            {connections.map((connection) => (
              <div key={connection.id} className="connection-item">
                <div className="connection-header">
                  <span className={`connection-type connection-type-${connection.connection_type.toLowerCase()}`}>
                    {connection.connection_type.replace('_', ' ').toUpperCase()}
                  </span>
                  <strong>{connection.connected_zone_name}</strong>
                </div>
                <p className="connection-description">{connection.description}</p>
                {connection.connected_zone_description && (
                  <p className="connected-zone-description">
                    <em>{connection.connected_zone_description}</em>
                  </p>
                )}
              </div>
            ))}
          </div>
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