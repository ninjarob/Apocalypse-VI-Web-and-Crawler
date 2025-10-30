import { useState, useEffect } from 'react';
import { api, Spell } from '../api';

export default function Spells() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filteredSpells = spells.filter(spell =>
    spell.name.toLowerCase().includes(search.toLowerCase()) ||
    spell.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading spells...</div>;
  }

  return (
    <div>
      <h2>Spells ({spells.length})</h2>
      
      <input
        type="text"
        className="search-box"
        placeholder="Search spells..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div className="entity-grid">
        {filteredSpells.map((spell) => (
          <div key={spell.id} className="entity-card">
            <h3>{spell.name}</h3>
            <p>{spell.description}</p>
            
            <div style={{ marginTop: '10px' }}>
              {spell.manaCost && <span className="tag">Mana: {spell.manaCost}</span>}
              {spell.level && <span className="tag">Level: {spell.level}</span>}
              {spell.type && <span className="tag">{spell.type}</span>}
            </div>
          </div>
        ))}
      </div>
      
      {filteredSpells.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          {spells.length === 0 
            ? 'No spells discovered yet. The crawler will document them as it explores.'
            : 'No spells found matching your search.'}
        </p>
      )}
    </div>
  );
}
