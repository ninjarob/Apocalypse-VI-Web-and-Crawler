import { NPC } from '@shared/types';
import { BackButton, DetailSection, DetailItem, DetailGrid } from '../index';

interface NPCDetailViewProps {
  item: NPC;
  onBack: () => void;
}

export function NPCDetailView({ item: npc, onBack }: NPCDetailViewProps) {
  return (
    <div>
      <BackButton onClick={onBack} label="Back to NPCs List" />

      <div className="detail-view">
        <h2>{npc.name}</h2>

        <DetailSection title="NPC Information">
          <DetailGrid>
            <DetailItem label="Name" value={npc.name} />

            {npc.level && (
              <DetailItem label="Level" value={npc.level} />
            )}

            {npc.race && (
              <DetailItem label="Race" value={npc.race} />
            )}

            {npc.class && (
              <DetailItem label="Class" value={npc.class} />
            )}

            <DetailItem
              label="Disposition"
              value={
                <span className={`tag ${npc.hostile ? 'hostile' : 'friendly'}`}>
                  {npc.hostile ? 'Hostile' : 'Friendly'}
                </span>
              }
            />

            {npc.location && (
              <DetailItem label="Location" value={npc.location} />
            )}
          </DetailGrid>

          {npc.description && (
            <div className="detail-item full-width" style={{ marginTop: '15px' }}>
              <span className="detail-label">Description:</span>
              <div className="detail-description">{npc.description}</div>
            </div>
          )}
        </DetailSection>

        {npc.dialogue && Array.isArray(npc.dialogue) && npc.dialogue.length > 0 && (
          <DetailSection title="Dialogue">
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              {npc.dialogue.map((line, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>
                  {line}
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {npc.rawText && (
          <DetailSection title="Raw MUD Text">
            <pre className="raw-text">{npc.rawText}</pre>
          </DetailSection>
        )}
      </div>
    </div>
  );
}
