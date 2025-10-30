import { useState, useEffect } from 'react';
import { api, Item } from '../api';

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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

  const filteredItems = items.filter(
    item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.type?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase())
  );

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
  };

  const handleBackToList = () => {
    setSelectedItem(null);
  };

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  // Detail View
  if (selectedItem) {
    return (
      <div>
        <button onClick={handleBackToList} style={{ marginBottom: '20px' }}>
          ← Back to Items List
        </button>

        <div className="detail-view">
          <h2>{selectedItem.name}</h2>

          {/* Item Info Section */}
          <div className="detail-section">
            <h3>Item Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{selectedItem.name}</span>
              </div>

              {selectedItem.type && (
                <div className="detail-item">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">
                    <span className="tag">{selectedItem.type}</span>
                  </span>
                </div>
              )}

              {selectedItem.location && (
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selectedItem.location}</span>
                </div>
              )}
            </div>

            {selectedItem.description && (
              <div className="detail-item full-width" style={{ marginTop: '15px' }}>
                <span className="detail-label">Description:</span>
                <div className="detail-description">{selectedItem.description}</div>
              </div>
            )}
          </div>

          {/* Item Stats Section */}
          {selectedItem.stats && Object.keys(selectedItem.stats).length > 0 && (
            <div className="detail-section">
              <h3>Stats</h3>
              <div className="detail-grid">
                {selectedItem.stats.damage && (
                  <div className="detail-item">
                    <span className="detail-label">Damage:</span>
                    <span className="detail-value">{selectedItem.stats.damage}</span>
                  </div>
                )}
                {selectedItem.stats.armor !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Armor:</span>
                    <span className="detail-value">{selectedItem.stats.armor}</span>
                  </div>
                )}
                {selectedItem.stats.weight !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Weight:</span>
                    <span className="detail-value">{selectedItem.stats.weight}</span>
                  </div>
                )}
                {selectedItem.stats.value !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Value:</span>
                    <span className="detail-value">{selectedItem.stats.value} gold</span>
                  </div>
                )}
                {selectedItem.stats.level !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Level Requirement:</span>
                    <span className="detail-value">{selectedItem.stats.level}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Properties Section */}
          {selectedItem.properties && Object.keys(selectedItem.properties).length > 0 && (
            <div className="detail-section">
              <h3>Properties</h3>
              <div className="detail-grid">
                {Object.entries(selectedItem.properties).map(([key, value]) => (
                  <div key={key} className="detail-item">
                    <span className="detail-label">{key}:</span>
                    <span className="detail-value">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Text Section */}
          {selectedItem.rawText && (
            <div className="detail-section">
              <h3>Raw MUD Text</h3>
              <pre className="raw-text">{selectedItem.rawText}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h2>Items ({items.length})</h2>

      <input
        type="text"
        className="search-box"
        placeholder="Search items by name, type, description, or location..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filteredItems.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          {items.length === 0 
            ? 'No items discovered yet. The crawler will populate this data during exploration.'
            : 'No items found matching your search.'}
        </p>
      ) : (
        <table className="entity-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Stats</th>
              <th>Location</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} onClick={() => handleItemClick(item)} style={{ cursor: 'pointer' }}>
                <td>
                  <strong>{item.name}</strong>
                </td>
                <td>
                  {item.type ? <span className="tag">{item.type}</span> : '—'}
                </td>
                <td>
                  {item.stats && Object.keys(item.stats).length > 0 ? (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {item.stats.damage && <span className="tag small">DMG: {item.stats.damage}</span>}
                      {item.stats.armor !== undefined && <span className="tag small">AC: {item.stats.armor}</span>}
                      {item.stats.weight !== undefined && <span className="tag small">WT: {item.stats.weight}</span>}
                      {item.stats.value !== undefined && <span className="tag small">VAL: {item.stats.value}</span>}
                      {item.stats.level !== undefined && <span className="tag small">LVL: {item.stats.level}</span>}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{item.location || '—'}</td>
                <td>
                  {item.description 
                    ? item.description.length > 60 
                      ? item.description.substring(0, 60) + '...' 
                      : item.description
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
