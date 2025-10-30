import { Spell } from '@shared/types';
import { GenericEntityPage, SpellDetailView, type ColumnConfig } from '../components';

const columns: ColumnConfig<Spell>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (spell) => <strong>{spell.name}</strong>
  },
  {
    key: 'type',
    label: 'Type',
    render: (spell) => spell.type ? <span className="tag">{spell.type}</span> : '—'
  },
  {
    key: 'level',
    label: 'Level',
    render: (spell) => spell.level !== undefined ? spell.level : '—'
  },
  {
    key: 'manaCost',
    label: 'Mana Cost',
    render: (spell) => spell.manaCost !== undefined ? spell.manaCost : '—'
  },
  {
    key: 'description',
    label: 'Description',
    render: (spell) => spell.description 
      ? spell.description.length > 80 
        ? spell.description.substring(0, 80) + '...' 
        : spell.description
      : '—'
  }
];

export default function Spells() {
  return (
    <GenericEntityPage<Spell>
      endpoint="/spells"
      entityName="Spells"
      entityNameSingular="Spell"
      columns={columns}
      searchFields={['name', 'description', 'type']}
      searchPlaceholder="Search spells by name, type, or description..."
      DetailView={SpellDetailView}
    />
  );
}
