import { useState, useEffect } from 'react';
import { api, Spell } from '../api';

export default function Spells() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  useEffect(() => {
    loadSpells();
  }, []);

  const loadSpells = async () => {
    try {
      const data = await api.get('/spells');
      setSpells(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load spells:', error);
      setLoading(false);
    }
  };

  const filteredSpells = spells.filter(
    spell =>
      spell.name.toLowerCase().includes(search.toLowerCase()) ||
      spell.description?.toLowerCase().includes(search.toLowerCase()) ||
      spell.type?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSpellClick = (spell: Spell) => {
    setSelectedSpell(spell);
  };

  const handleBackToList = () => {
    setSelectedSpell(null);
  };

  if (loading) {
    return <div className="loading">Loading spells...</div>;
  }

  // Detail View
  if (selectedSpell) {
    return (
      <div>
        <button onClick={handleBackToList} style={{ marginBottom: '20px' }}>
          ← Back to Spells List
        </button>

        <div className="detail-view">
          <h2>{selectedSpell.name}</h2>

          {/* Spell Info Section */}
          <div className="detail-section">
            <h3>Spell Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{selectedSpell.name}</span>
              </div>

              {selectedSpell.type && (
                <div className="detail-item">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">
                    <span className="tag">{selectedSpell.type}</span>
                  </span>
                </div>
              )}

              {selectedSpell.level !== undefined && (
                <div className="detail-item">
                  <span className="detail-label">Level:</span>
                  <span className="detail-value">{selectedSpell.level}</span>
                </div>
              )}

              {selectedSpell.manaCost !== undefined && (
                <div className="detail-item">
                  <span className="detail-label">Mana Cost:</span>
                  <span className="detail-value">{selectedSpell.manaCost}</span>
                </div>
              )}
            </div>

            {selectedSpell.description && (
              <div className="detail-item full-width" style={{ marginTop: '15px' }}>
                <span className="detail-label">Description:</span>
                <div className="detail-description">{selectedSpell.description}</div>
              </div>
            )}
          </div>

          {/* Effects Section */}
          {selectedSpell.effects && Array.isArray(selectedSpell.effects) && selectedSpell.effects.length > 0 && (
            <div className="detail-section">
              <h3>Effects</h3>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                {selectedSpell.effects.map((effect, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {effect}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Text Section */}
          {selectedSpell.rawText && (
            <div className="detail-section">
              <h3>Raw MUD Text</h3>
              <pre className="raw-text">{selectedSpell.rawText}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h2>Spells ({spells.length})</h2>

      <input
        type="text"
        className="search-box"
        placeholder="Search spells by name, type, or description..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filteredSpells.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          {spells.length === 0
            ? 'No spells discovered yet. The crawler will document them as it explores.'
            : 'No spells found matching your search.'}
        </p>
      ) : (
        <table className="entity-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Level</th>
              <th>Mana Cost</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredSpells.map(spell => (
              <tr key={spell.id} onClick={() => handleSpellClick(spell)} style={{ cursor: 'pointer' }}>
                <td>
                  <strong>{spell.name}</strong>
                </td>
                <td>
                  {spell.type ? <span className="tag">{spell.type}</span> : '—'}
                </td>
                <td>{spell.level !== undefined ? spell.level : '—'}</td>
                <td>{spell.manaCost !== undefined ? spell.manaCost : '—'}</td>
                <td>
                  {spell.description 
                    ? spell.description.length > 80 
                      ? spell.description.substring(0, 80) + '...' 
                      : spell.description
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
