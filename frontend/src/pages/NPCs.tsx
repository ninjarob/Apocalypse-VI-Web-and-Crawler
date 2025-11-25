import { NPC } from '@shared/types';
import { GenericEntityPage, NPCDetailView, type ColumnConfig } from '../components';

const columns: ColumnConfig<NPC>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (npc) => <strong>{npc.name}</strong>
  },
  {
    key: 'level',
    label: 'Level',
    render: (npc) => npc.level || '—'
  },
  {
    key: 'race',
    label: 'Race',
    render: (npc) => npc.race || '—'
  },
  {
    key: 'class',
    label: 'Class',
    render: (npc) => npc.class || '—'
  },
  {
    key: 'disposition',
    label: 'Disposition',
    render: (npc) => npc.is_aggressive !== undefined ? (
      <span className={`tag ${npc.is_aggressive ? 'hostile' : 'friendly'}`}>
        {npc.is_aggressive ? 'Aggressive' : 'Non-Aggressive'}
      </span>
    ) : '—'
  },
  {
    key: 'location',
    label: 'Location',
    render: (npc) => npc.location || '—'
  },
  {
    key: 'description',
    label: 'Description',
    render: (npc) => npc.description 
      ? npc.description.length > 80 
        ? npc.description.substring(0, 80) + '...' 
        : npc.description
      : '—'
  }
];

export default function NPCs() {
  return (
    <GenericEntityPage<NPC>
      endpoint="/npcs"
      entityName="NPCs"
      entityNameSingular="NPC"
      columns={columns}
      searchFields={['name', 'description', 'location', 'race', 'class']}
      searchPlaceholder="Search NPCs by name, description, location, race, or class..."
      DetailView={NPCDetailView}
    />
  );
}
