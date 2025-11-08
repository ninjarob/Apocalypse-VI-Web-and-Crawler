import React, { useState, useMemo } from 'react';
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

type SortField = 'name' | 'zone' | 'zone_exit';
type SortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [nameFilter, setNameFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Only filter if there's a filter value
      const matchesName = !nameFilter || room.name?.toLowerCase().includes(nameFilter.toLowerCase());
      const zoneName = allZones.find(z => z.id === room.zone_id)?.name?.toLowerCase() || '';
      const matchesZone = !zoneFilter || zoneName.includes(zoneFilter.toLowerCase());
      return matchesName && matchesZone;
    });
  }, [rooms, nameFilter, zoneFilter, allZones]);

  const sortedRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'zone':
          aValue = allZones.find(z => z.id === a.zone_id)?.name?.toLowerCase() || '';
          bValue = allZones.find(z => z.id === b.zone_id)?.name?.toLowerCase() || '';
          break;
        case 'zone_exit':
          aValue = a.zone_exit ? 1 : 0;
          bValue = b.zone_exit ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRooms, sortField, sortDirection, allZones]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return ' ▾';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  if (rooms.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

  return (
    <div className="entity-table-container">
      {/* Filter inputs */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter by name..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        />
        {showZoneColumn && (
          <input
            type="text"
            placeholder="Filter by zone..."
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          />
        )}
        {(nameFilter || zoneFilter) && (
          <button
            onClick={() => {
              setNameFilter('');
              setZoneFilter('');
            }}
            style={{
              padding: '8px 12px',
              background: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear Filters
          </button>
        )}
        <span style={{ alignSelf: 'center', color: '#666', fontSize: '14px' }}>
          {filteredRooms.length} of {rooms.length} rooms
        </span>
      </div>

      <table className="entity-table">
        <thead>
          <tr>
            <th 
              onClick={() => handleSort('name')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Name{getSortIcon('name')}
            </th>
            {showZoneColumn && (
              <th 
                onClick={() => handleSort('zone')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Zone{getSortIcon('zone')}
              </th>
            )}
            <th 
              onClick={() => handleSort('zone_exit')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Zone Exit{getSortIcon('zone_exit')}
            </th>
            {handleDelete && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedRooms.map(room => {
            return (
              <tr
                key={room.id}
                className="clickable-row"
                onClick={() => handleRoomClick(room)}
              >
                <td>
                  {room.name}
                  {room.portal_key && <span style={{ color: '#888', marginLeft: '8px' }}>({room.portal_key})</span>}
                </td>
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
                <td style={{ textAlign: 'center' }}>
                  {room.zone_exit ? (
                    <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✓</span>
                  ) : (
                    <span style={{ color: '#ccc' }}>—</span>
                  )}
                </td>
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
