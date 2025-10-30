import { useState, useEffect } from 'react';
import { api, Item } from '../api';

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await api.get('/items');
      setItems(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load items:', error);
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  return (
    <div>
      <h2>Items ({items.length})</h2>
      
      <input
        type="text"
        className="search-box"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div className="entity-grid">
        {filteredItems.map((item) => (
          <div key={item.id} className="entity-card">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            
            {item.stats && Object.keys(item.stats).length > 0 && (
              <div style={{ marginTop: '10px' }}>
                {item.stats.damage && <span className="tag">Damage: {item.stats.damage}</span>}
                {item.stats.armor && <span className="tag">Armor: {item.stats.armor}</span>}
                {item.stats.weight && <span className="tag">Weight: {item.stats.weight}</span>}
                {item.stats.value && <span className="tag">Value: {item.stats.value}</span>}
              </div>
            )}
            
            {item.type && (
              <div style={{ marginTop: '10px' }}>
                <span className="tag">{item.type}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredItems.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          No items found matching your search.
        </p>
      )}
    </div>
  );
}
