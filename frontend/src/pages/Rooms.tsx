import { useState, useEffect } from 'react';
import { Room } from '../api';
import { useApi, useSearch } from '../hooks';
import { Loading, SearchBox, EmptyState } from '../components';
import RoomForm from '../components/RoomForm';

export default function Rooms() {
  const { data: rooms, loading, reload } = useApi<Room>('/rooms');
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();

  // Debug: Log the first room to see what data we're getting
  useEffect(() => {
    if (rooms.length > 0) {
      console.log('First room data:', rooms[0]);
      console.log('Room coordinates:', { x: rooms[0].x, y: rooms[0].y });
      console.log('Coordinate types:', { xType: typeof rooms[0].x, yType: typeof rooms[0].y });
      console.log('Coordinate checks:', {
        xUndefined: rooms[0].x === undefined,
        yUndefined: rooms[0].y === undefined,
        xNull: rooms[0].x === null,
        yNull: rooms[0].y === null
      });
    }
  }, [rooms]);

  const { searchTerm, setSearchTerm, filteredItems: filteredRooms } = useSearch(
    rooms,
    (room, term) =>
      room.name.toLowerCase().includes(term) ||
      room.description.toLowerCase().includes(term)
  );

  const handleAddRoom = () => {
    setEditingRoom(undefined);
    setShowForm(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setShowForm(true);
  };

  const handleSaveRoom = async (roomData: Partial<Room>) => {
    try {
      if (editingRoom) {
        // Update existing room
        await fetch(`/api/rooms/${editingRoom.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roomData)
        });
      } else {
        // Create new room
        await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roomData)
        });
      }
      setShowForm(false);
      reload(); // Refresh the rooms list
    } catch (error) {
      console.error('Failed to save room:', error);
      alert('Failed to save room. Please try again.');
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(`Are you sure you want to delete "${room.name}"?`)) {
      return;
    }

    try {
      await fetch(`/api/rooms/${room.id}`, {
        method: 'DELETE'
      });
      reload(); // Refresh the rooms list
    } catch (error) {
      console.error('Failed to delete room:', error);
      alert('Failed to delete room. Please try again.');
    }
  };

  if (loading) {
    return <Loading message="Loading rooms..." />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Rooms ({rooms.length})</h2>
        <button className="btn-primary" onClick={handleAddRoom}>
          Add Room
        </button>
      </div>

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
              <h3>
                {room.name}
                {room.portal_key && <span style={{ color: '#888', fontWeight: 'normal' }}> ({room.portal_key})</span>}
              </h3>
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
                {/* Debug: Show coordinate info */}
                <div>Debug - x: {JSON.stringify(room.x)} (type: {typeof room.x}), y: {JSON.stringify(room.y)} (type: {typeof room.y})</div>
                {/* Always show coordinates since they're always present */}
                <div style={{ marginTop: '5px' }}>
                  <strong>Coordinates:</strong> ({room.x ?? 0}, {room.y ?? 0})
                </div>
                {room.portal_key && (
                  <div style={{ marginTop: '5px' }}>
                    <strong>Portal Key:</strong> <code>{room.portal_key}</code>
                  </div>
                )}
                {room.greater_binding_key && (
                  <div style={{ marginTop: '5px' }}>
                    <strong>Greater Binding Key:</strong> <code>{room.greater_binding_key}</code>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => handleEditRoom(room)}
                >
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteRoom(room)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <RoomForm
          room={editingRoom}
          onSave={handleSaveRoom}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
