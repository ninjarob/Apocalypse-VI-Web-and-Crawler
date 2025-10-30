import { Item } from '../api';
import { useApi, useSearch, useDetailView } from '../hooks';
import { Loading, SearchBox, BackButton, DetailSection, DetailItem, DetailGrid, EmptyState } from '../components';

export default function Items() {
  const { data: items, loading } = useApi<Item>('/items');
  const { selectedItem, showDetail, hideDetail } = useDetailView<Item>();
  
  const { searchTerm, setSearchTerm, filteredItems } = useSearch(
    items,
    (item, term) =>
      item.name.toLowerCase().includes(term) ||
      (item.description?.toLowerCase().includes(term) ?? false) ||
      (item.type?.toLowerCase().includes(term) ?? false) ||
      (item.location?.toLowerCase().includes(term) ?? false)
  );

  if (loading) {
    return <Loading message="Loading items..." />;
  }

  // Detail View
  if (selectedItem) {
    return (
      <div>
        <BackButton onClick={hideDetail} label="Back to Items List" />

        <div className="detail-view">
          <h2>{selectedItem.name}</h2>

          {/* Item Info Section */}
          <DetailSection title="Item Information">
            <DetailGrid>
              <DetailItem label="Name" value={selectedItem.name} />

              {selectedItem.type && (
                <DetailItem label="Type" value={<span className="tag">{selectedItem.type}</span>} />
              )}

              {selectedItem.location && (
                <DetailItem label="Location" value={selectedItem.location} />
              )}
            </DetailGrid>

            {selectedItem.description && (
              <div className="detail-item full-width" style={{ marginTop: '15px' }}>
                <span className="detail-label">Description:</span>
                <div className="detail-description">{selectedItem.description}</div>
              </div>
            )}
          </DetailSection>

          {/* Item Stats Section */}
          {selectedItem.stats && Object.keys(selectedItem.stats).length > 0 && (
            <DetailSection title="Stats">
              <DetailGrid>
                {selectedItem.stats.damage && (
                  <DetailItem label="Damage" value={selectedItem.stats.damage} />
                )}
                {selectedItem.stats.armor !== undefined && (
                  <DetailItem label="Armor" value={selectedItem.stats.armor} />
                )}
                {selectedItem.stats.weight !== undefined && (
                  <DetailItem label="Weight" value={selectedItem.stats.weight} />
                )}
                {selectedItem.stats.value !== undefined && (
                  <DetailItem label="Value" value={`${selectedItem.stats.value} gold`} />
                )}
                {selectedItem.stats.level !== undefined && (
                  <DetailItem label="Level Requirement" value={selectedItem.stats.level} />
                )}
              </DetailGrid>
            </DetailSection>
          )}

          {/* Properties Section */}
          {selectedItem.properties && Object.keys(selectedItem.properties).length > 0 && (
            <DetailSection title="Properties">
              <DetailGrid>
                {Object.entries(selectedItem.properties).map(([key, value]) => (
                  <DetailItem
                    key={key}
                    label={key}
                    value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  />
                ))}
              </DetailGrid>
            </DetailSection>
          )}

          {/* Raw Text Section */}
          {selectedItem.rawText && (
            <DetailSection title="Raw MUD Text">
              <pre className="raw-text">{selectedItem.rawText}</pre>
            </DetailSection>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h2>Items ({items.length})</h2>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search items by name, type, description, or location..."
      />

      {filteredItems.length === 0 ? (
        <EmptyState
          message={
            items.length === 0
              ? 'No items discovered yet. The crawler will populate this data during exploration.'
              : 'No items found matching your search.'
          }
        />
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
              <tr key={item.id} onClick={() => showDetail(item)} style={{ cursor: 'pointer' }}>
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
