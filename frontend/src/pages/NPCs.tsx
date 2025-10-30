import { NPC } from '../api';
import { useApi, useSearch, useDetailView } from '../hooks';
import { Loading, SearchBox, BackButton, DetailSection, DetailItem, DetailGrid, EmptyState } from '../components';

export default function NPCs() {
  const { data: npcs, loading } = useApi<NPC>('/npcs');
  const { selectedItem: selectedNPC, showDetail, hideDetail } = useDetailView<NPC>();
  
  const { searchTerm, setSearchTerm, filteredItems: filteredNPCs } = useSearch(
    npcs,
    (npc, term) =>
      npc.name.toLowerCase().includes(term) ||
      (npc.description?.toLowerCase().includes(term) ?? false) ||
      (npc.location?.toLowerCase().includes(term) ?? false) ||
      (npc.race?.toLowerCase().includes(term) ?? false) ||
      (npc.class?.toLowerCase().includes(term) ?? false)
  );

  if (loading) {
    return <Loading message="Loading NPCs..." />;
  }

  // Detail View
  if (selectedNPC) {
    return (
      <div>
        <BackButton onClick={hideDetail} label="Back to NPCs List" />

        <div className="detail-view">
          <h2>{selectedNPC.name}</h2>

          {/* NPC Info Section */}
          <DetailSection title="NPC Information">
            <DetailGrid>
              <DetailItem label="Name" value={selectedNPC.name} />

              {selectedNPC.level && (
                <DetailItem label="Level" value={selectedNPC.level} />
              )}

              {selectedNPC.race && (
                <DetailItem label="Race" value={selectedNPC.race} />
              )}

              {selectedNPC.class && (
                <DetailItem label="Class" value={selectedNPC.class} />
              )}

              <DetailItem
                label="Disposition"
                value={
                  <span className={`tag ${selectedNPC.hostile ? 'hostile' : 'friendly'}`}>
                    {selectedNPC.hostile ? 'Hostile' : 'Friendly'}
                  </span>
                }
              />

              {selectedNPC.location && (
                <DetailItem label="Location" value={selectedNPC.location} />
              )}
            </DetailGrid>

            {selectedNPC.description && (
              <div className="detail-item full-width" style={{ marginTop: '15px' }}>
                <span className="detail-label">Description:</span>
                <div className="detail-description">{selectedNPC.description}</div>
              </div>
            )}
          </DetailSection>

          {/* Dialogue Section */}
          {selectedNPC.dialogue && Array.isArray(selectedNPC.dialogue) && selectedNPC.dialogue.length > 0 && (
            <DetailSection title="Dialogue">
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                {selectedNPC.dialogue.map((line, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {line}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {/* Raw Text Section */}
          {selectedNPC.rawText && (
            <DetailSection title="Raw MUD Text">
              <pre className="raw-text">{selectedNPC.rawText}</pre>
            </DetailSection>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h2>NPCs ({npcs.length})</h2>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search NPCs by name, description, location, race, or class..."
      />

      {filteredNPCs.length === 0 ? (
        <EmptyState
          message={
            npcs.length === 0
              ? 'No NPCs discovered yet. The crawler will populate this data during exploration.'
              : 'No NPCs found matching your search.'
          }
        />
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
              <tr key={npc.id} onClick={() => showDetail(npc)} style={{ cursor: 'pointer' }}>
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
