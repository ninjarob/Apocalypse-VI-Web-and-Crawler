import { Spell } from '../api';
import { useApi, useSearch, useDetailView } from '../hooks';
import { Loading, SearchBox, BackButton, DetailSection, DetailItem, DetailGrid, EmptyState } from '../components';

export default function Spells() {
  const { data: spells, loading } = useApi<Spell>('/spells');
  const { selectedItem: selectedSpell, showDetail, hideDetail } = useDetailView<Spell>();
  
  const { searchTerm, setSearchTerm, filteredItems: filteredSpells } = useSearch(
    spells,
    (spell, term) =>
      spell.name.toLowerCase().includes(term) ||
      (spell.description?.toLowerCase().includes(term) ?? false) ||
      (spell.type?.toLowerCase().includes(term) ?? false)
  );

  if (loading) {
    return <Loading message="Loading spells..." />;
  }

  // Detail View
  if (selectedSpell) {
    return (
      <div>
        <BackButton onClick={hideDetail} label="Back to Spells List" />

        <div className="detail-view">
          <h2>{selectedSpell.name}</h2>

          {/* Spell Info Section */}
          <DetailSection title="Spell Information">
            <DetailGrid>
              <DetailItem label="Name" value={selectedSpell.name} />

              {selectedSpell.type && (
                <DetailItem label="Type" value={<span className="tag">{selectedSpell.type}</span>} />
              )}

              {selectedSpell.level !== undefined && (
                <DetailItem label="Level" value={selectedSpell.level} />
              )}

              {selectedSpell.manaCost !== undefined && (
                <DetailItem label="Mana Cost" value={selectedSpell.manaCost} />
              )}
            </DetailGrid>

            {selectedSpell.description && (
              <div className="detail-item full-width" style={{ marginTop: '15px' }}>
                <span className="detail-label">Description:</span>
                <div className="detail-description">{selectedSpell.description}</div>
              </div>
            )}
          </DetailSection>

          {/* Effects Section */}
          {selectedSpell.effects && Array.isArray(selectedSpell.effects) && selectedSpell.effects.length > 0 && (
            <DetailSection title="Effects">
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                {selectedSpell.effects.map((effect, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {effect}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {/* Raw Text Section */}
          {selectedSpell.rawText && (
            <DetailSection title="Raw MUD Text">
              <pre className="raw-text">{selectedSpell.rawText}</pre>
            </DetailSection>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h2>Spells ({spells.length})</h2>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search spells by name, type, or description..."
      />

      {filteredSpells.length === 0 ? (
        <EmptyState
          message={
            spells.length === 0
              ? 'No spells discovered yet. The crawler will document them as it explores.'
              : 'No spells found matching your search.'
          }
        />
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
              <tr key={spell.id} onClick={() => showDetail(spell)} style={{ cursor: 'pointer' }}>
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
