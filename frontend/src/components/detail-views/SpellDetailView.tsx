import { Spell } from '@shared/types';
import { BackButton, DetailSection, DetailItem, DetailGrid } from '../index';

interface SpellDetailViewProps {
  item: Spell;
  onBack: () => void;
}

export function SpellDetailView({ item: spell, onBack }: SpellDetailViewProps) {
  return (
    <div>
      <BackButton onClick={onBack} label="Back to Spells List" />

      <div className="detail-view">
        <h2>{spell.name}</h2>

        <DetailSection title="Spell Information">
          <DetailGrid>
            <DetailItem label="Name" value={spell.name} />

            {spell.type && (
              <DetailItem label="Type" value={<span className="tag">{spell.type}</span>} />
            )}

            {spell.level !== undefined && (
              <DetailItem label="Level" value={spell.level} />
            )}

            {spell.manaCost !== undefined && (
              <DetailItem label="Mana Cost" value={spell.manaCost} />
            )}
          </DetailGrid>

          {spell.description && (
            <div className="detail-item full-width" style={{ marginTop: '15px' }}>
              <span className="detail-label">Description:</span>
              <div className="detail-description">{spell.description}</div>
            </div>
          )}
        </DetailSection>

        {spell.effects && Array.isArray(spell.effects) && spell.effects.length > 0 && (
          <DetailSection title="Effects">
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              {spell.effects.map((effect, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>
                  {effect}
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {spell.rawText && (
          <DetailSection title="Raw MUD Text">
            <pre className="raw-text">{spell.rawText}</pre>
          </DetailSection>
        )}
      </div>
    </div>
  );
}
