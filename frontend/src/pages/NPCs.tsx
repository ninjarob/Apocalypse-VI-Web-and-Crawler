import { useState, useEffect } from 'react';
import { api, NPC } from '../api';

export default function NPCs() {
  const [npcs, setNPCs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadNPCs = async () => {
    try {
      const data = await api.get('/npcs');
      setNPCs(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load NPCs:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNPCs();
  }, []);

  const filteredNPCs = npcs.filter(
    npc =>
      npc.name.toLowerCase().includes(search.toLowerCase()) ||
      npc.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading NPCs...</div>;
  }

  return (
    <div>
      <h2>NPCs ({npcs.length})</h2>

      <input
        type="text"
        className="search-box"
        placeholder="Search NPCs..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="entity-grid">
        {filteredNPCs.map(npc => (
          <div key={npc.id} className="entity-card">
            <h3>{npc.name}</h3>
            <p>{npc.description}</p>

            <div style={{ marginTop: '10px' }}>
              {npc.hostile !== undefined && (
                <span className={`tag ${npc.hostile ? 'hostile' : 'friendly'}`}>
                  {npc.hostile ? 'Hostile' : 'Friendly'}
                </span>
              )}
              {npc.level && <span className="tag">Level {npc.level}</span>}
              {npc.race && <span className="tag">{npc.race}</span>}
              {npc.class && <span className="tag">{npc.class}</span>}
            </div>

            {npc.location && (
              <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#666' }}>
                Location: {npc.location}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredNPCs.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          No NPCs found matching your search.
        </p>
      )}
    </div>
  );
}
