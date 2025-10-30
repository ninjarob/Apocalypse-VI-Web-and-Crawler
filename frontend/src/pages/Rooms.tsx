import { useState, useEffect } from 'react';
import { api, Room } from '../api';

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await api.get('/rooms');
      setRooms(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(search.toLowerCase()) ||
    room.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading rooms...</div>;
  }

  return (
    <div>
      <h2>Rooms ({rooms.length})</h2>
      
      <input
        type="text"
        className="search-box"
        placeholder="Search rooms..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div className="entity-grid">
        {filteredRooms.map((room) => (
          <div key={room.id} className="entity-card">
            <h3>{room.name}</h3>
            <p>{room.description.substring(0, 150)}...</p>
            
            <div style={{ marginTop: '10px' }}>
              {room.exits.map((exit, idx) => (
                <span key={idx} className="tag">{exit.direction}</span>
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
        ))}
      </div>
      
      {filteredRooms.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          No rooms found matching your search.
        </p>
      )}
    </div>
  );
}
