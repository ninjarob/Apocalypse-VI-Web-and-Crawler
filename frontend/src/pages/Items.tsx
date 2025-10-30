import { Item } from '@shared/types';
import { GenericEntityPage, ItemDetailView, type ColumnConfig } from '../components';

const columns: ColumnConfig<Item>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (item) => <strong>{item.name}</strong>
  },
  {
    key: 'type',
    label: 'Type',
    render: (item) => item.type ? <span className="tag">{item.type}</span> : '—'
  },
  {
    key: 'stats',
    label: 'Stats',
    render: (item) => item.stats && Object.keys(item.stats).length > 0 ? (
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {item.stats.damage && <span className="tag small">DMG: {item.stats.damage}</span>}
        {item.stats.armor !== undefined && <span className="tag small">AC: {item.stats.armor}</span>}
        {item.stats.weight !== undefined && <span className="tag small">WT: {item.stats.weight}</span>}
        {item.stats.value !== undefined && <span className="tag small">VAL: {item.stats.value}</span>}
        {item.stats.level !== undefined && <span className="tag small">LVL: {item.stats.level}</span>}
      </div>
    ) : '—'
  },
  {
    key: 'location',
    label: 'Location',
    render: (item) => item.location || '—'
  },
  {
    key: 'description',
    label: 'Description',
    render: (item) => item.description 
      ? item.description.length > 60 
        ? item.description.substring(0, 60) + '...' 
        : item.description
      : '—'
  }
];

export default function Items() {
  return (
    <GenericEntityPage<Item>
      endpoint="/items"
      entityName="Items"
      entityNameSingular="Item"
      columns={columns}
      searchFields={['name', 'description', 'type', 'location']}
      searchPlaceholder="Search items by name, type, description, or location..."
      DetailView={ItemDetailView}
    />
  );
}
