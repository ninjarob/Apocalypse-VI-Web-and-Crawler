import { useState, useEffect } from 'react';
import { api, NPC } from '../api';

export default function NPCs() {
  const [npcs, setNPCs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);

  useEffect(() => {
    loadNPCs();
  }, []);

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

  const filteredNPCs = npcs.filter(
    npc =>
      npc.name.toLowerCase().includes(search.toLowerCase()) ||
      npc.description?.toLowerCase().includes(search.toLowerCase()) ||
      npc.location?.toLowerCase().includes(search.toLowerCase()) ||
      npc.race?.toLowerCase().includes(search.toLowerCase()) ||
      npc.class?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNPCClick = (npc: NPC) => {
    setSelectedNPC(npc);
  };

  const handleBackToList = () => {
    setSelectedNPC(null);
  };

  if (loading) {
    return <div className="loading">Loading NPCs...</div>;
  }

  // Detail View
  if (selectedNPC) {
    return (
      <div>
        <button onClick={handleBackToList} style={{ marginBottom: '20px' }}>
          ← Back to NPCs List
        </button>

        <div className="detail-view">
          <h2>{selectedNPC.name}</h2>

          {/* NPC Info Section */}
          <div className="detail-section">
            <h3>NPC Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{selectedNPC.name}</span>
              </div>

              {selectedNPC.level && (
                <div className="detail-item">
                  <span className="detail-label">Level:</span>
                  <span className="detail-value">{selectedNPC.level}</span>
                </div>
              )}

              {selectedNPC.race && (
                <div className="detail-item">
                  <span className="detail-label">Race:</span>
                  <span className="detail-value">{selectedNPC.race}</span>
                </div>
              )}

              {selectedNPC.class && (
                <div className="detail-item">
                  <span className="detail-label">Class:</span>
                  <span className="detail-value">{selectedNPC.class}</span>
                </div>
              )}

              <div className="detail-item">
                <span className="detail-label">Disposition:</span>
                <span className="detail-value">
                  <span className={`tag ${selectedNPC.hostile ? 'hostile' : 'friendly'}`}>
                    {selectedNPC.hostile ? 'Hostile' : 'Friendly'}
                  </span>
                </span>
              </div>

              {selectedNPC.location && (
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selectedNPC.location}</span>
                </div>
              )}
            </div>

            {selectedNPC.description && (
              <div className="detail-item full-width" style={{ marginTop: '15px' }}>
                <span className="detail-label">Description:</span>
                <div className="detail-description">{selectedNPC.description}</div>
              </div>
            )}
          </div>

          {/* Dialogue Section */}
          {selectedNPC.dialogue && Array.isArray(selectedNPC.dialogue) && selectedNPC.dialogue.length > 0 && (
            <div className="detail-section">
              <h3>Dialogue</h3>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                {selectedNPC.dialogue.map((line, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Text Section */}
          {selectedNPC.rawText && (
            <div className="detail-section">
              <h3>Raw MUD Text</h3>
              <pre className="raw-text">{selectedNPC.rawText}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h2>NPCs ({npcs.length})</h2>

      <input
        type="text"
        className="search-box"
        placeholder="Search NPCs by name, description, location, race, or class..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filteredNPCs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          {npcs.length === 0 
            ? 'No NPCs discovered yet. The crawler will populate this data during exploration.'
            : 'No NPCs found matching your search.'}
        </p>
      ) : (
        <table className="entity-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Level</th>
              <th>Race</th>
              <th>Class</th>
              <th>Disposition</th>
              <th>Location</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredNPCs.map(npc => (
              <tr key={npc.id} onClick={() => handleNPCClick(npc)} style={{ cursor: 'pointer' }}>
                <td>
                  <strong>{npc.name}</strong>
                </td>
                <td>{npc.level || '—'}</td>
                <td>{npc.race || '—'}</td>
                <td>{npc.class || '—'}</td>
                <td>
                  {npc.hostile !== undefined ? (
                    <span className={`tag ${npc.hostile ? 'hostile' : 'friendly'}`}>
                      {npc.hostile ? 'Hostile' : 'Friendly'}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{npc.location || '—'}</td>
                <td>
                  {npc.description 
                    ? npc.description.length > 80 
                      ? npc.description.substring(0, 80) + '...' 
                      : npc.description
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
