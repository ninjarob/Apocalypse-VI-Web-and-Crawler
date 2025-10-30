import { Item } from '@shared/types';
import { BackButton, DetailSection, DetailItem, DetailGrid } from '../index';

interface ItemDetailViewProps {
  item: Item;
  onBack: () => void;
}

export function ItemDetailView({ item, onBack }: ItemDetailViewProps) {
  return (
    <div>
      <BackButton onClick={onBack} label="Back to Items List" />

      <div className="detail-view">
        <h2>{item.name}</h2>

        <DetailSection title="Item Information">
          <DetailGrid>
            <DetailItem label="Name" value={item.name} />

            {item.type && (
              <DetailItem label="Type" value={<span className="tag">{item.type}</span>} />
            )}

            {item.location && (
              <DetailItem label="Location" value={item.location} />
            )}
          </DetailGrid>

          {item.description && (
            <div className="detail-item full-width" style={{ marginTop: '15px' }}>
              <span className="detail-label">Description:</span>
              <div className="detail-description">{item.description}</div>
            </div>
          )}
        </DetailSection>

        {item.stats && Object.keys(item.stats).length > 0 && (
          <DetailSection title="Stats">
            <DetailGrid>
              {item.stats.damage && (
                <DetailItem label="Damage" value={item.stats.damage} />
              )}
              {item.stats.armor !== undefined && (
                <DetailItem label="Armor" value={item.stats.armor} />
              )}
              {item.stats.weight !== undefined && (
                <DetailItem label="Weight" value={item.stats.weight} />
              )}
              {item.stats.value !== undefined && (
                <DetailItem label="Value" value={`${item.stats.value} gold`} />
              )}
              {item.stats.level !== undefined && (
                <DetailItem label="Level Requirement" value={item.stats.level} />
              )}
            </DetailGrid>
          </DetailSection>
        )}

        {item.properties && Object.keys(item.properties).length > 0 && (
          <DetailSection title="Properties">
            <DetailGrid>
              {Object.entries(item.properties).map(([key, value]) => (
                <DetailItem
                  key={key}
                  label={key}
                  value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                />
              ))}
            </DetailGrid>
          </DetailSection>
        )}

        {item.rawText && (
          <DetailSection title="Raw MUD Text">
            <pre className="raw-text">{item.rawText}</pre>
          </DetailSection>
        )}
      </div>
    </div>
  );
}
