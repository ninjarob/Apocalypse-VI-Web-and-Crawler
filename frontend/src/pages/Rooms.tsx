import { Room } from '../api';
import { useApi, useSearch } from '../hooks';
import { Loading, SearchBox, EmptyState } from '../components';

export default function Rooms() {
  const { data: rooms, loading } = useApi<Room>('/rooms');
  
  const { searchTerm, setSearchTerm, filteredItems: filteredRooms } = useSearch(
    rooms,
    (room, term) =>
      room.name.toLowerCase().includes(term) ||
      room.description.toLowerCase().includes(term)
  );

  if (loading) {
    return <Loading message="Loading rooms..." />;
  }

  return (
    <div>
      <h2>Rooms ({rooms.length})</h2>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search rooms..."
      />

      <div className="entity-grid">
        {filteredRooms.length === 0 ? (
          <EmptyState message="No rooms found matching your search." />
        ) : (
          filteredRooms.map(room => (
            <div key={room.id} className="entity-card">
              <h3>{room.name}</h3>
              <p>{room.description.substring(0, 150)}...</p>

              <div style={{ marginTop: '10px' }}>
                {room.exits.map((exit, idx) => (
                  <span key={idx} className="tag">
                    {exit.direction}
                  </span>
                ))}
              </div>

              {room.npcs.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <strong>NPCs:</strong> {room.npcs.join(', ')}
                </div>
              )}

              <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#666' }}>
                Visited {room.visitCount} time(s)
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
