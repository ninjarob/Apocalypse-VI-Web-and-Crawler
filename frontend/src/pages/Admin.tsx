import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';

interface Entity {
  [key: string]: any;
}

interface EntityConfig {
  name: string;
  endpoint: string;
  readOnly?: boolean;
  clickable?: boolean;
  fields: {
    name: string;
    type: 'text' | 'textarea' | 'number' | 'json' | 'custom';
    label: string;
    required?: boolean;
    hideInTable?: boolean;
    custom?: string;
  }[];
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    name: 'Abilities',
    endpoint: 'abilities',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'short_name', type: 'text', label: 'Short Name' },
      { name: 'description', type: 'textarea', label: 'Description' }
    ]
  },
  {
    name: 'Saving Throws',
    endpoint: 'saving_throws',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description' }
    ]
  },
  {
    name: 'Spell Modifiers',
    endpoint: 'spell_modifiers',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description' }
    ]
  },
  {
    name: 'Elemental Resistances',
    endpoint: 'elemental_resistances',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description' }
    ]
  },
  {
    name: 'Physical Resistances',
    endpoint: 'physical_resistances',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description' }
    ]
  },
  {
    name: 'Races',
    endpoint: 'races',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'stats', type: 'json', label: 'Stats (JSON)' },
      { name: 'abilities', type: 'json', label: 'Abilities (JSON Array)' }
    ]
  },
  {
    name: 'Classes',
    endpoint: 'classes',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'stats_combined', type: 'text', label: 'Stats' },
      { name: 'special_notes', type: 'textarea', label: 'Special Notes' }
    ]
  },
  {
    name: 'Skills',
    endpoint: 'skills',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'type', type: 'text', label: 'Type' },
      { name: 'manaCost', type: 'number', label: 'Mana Cost' },
      { name: 'cooldown', type: 'number', label: 'Cooldown' }
    ]
  },
  {
    name: 'Zones',
    endpoint: 'zones',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'Zone #' },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'zone_info_combined', type: 'custom', label: 'Zone Info' },
      { name: 'notes', type: 'textarea', label: 'Notes' }
    ]
  },
  {
    name: 'Player Actions',
    endpoint: 'player_actions',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Action', required: true },
      { name: 'type', type: 'text', label: 'Type', required: true },
      { name: 'category', type: 'text', label: 'Category' },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'syntax', type: 'textarea', label: 'Syntax', hideInTable: true },
      { name: 'examples', type: 'textarea', label: 'Examples', hideInTable: true },
      { name: 'requirements', type: 'text', label: 'Requirements', hideInTable: true },
      { name: 'levelRequired', type: 'number', label: 'Level Required', hideInTable: true },
      { name: 'relatedActions', type: 'text', label: 'Related Actions', hideInTable: true },
      { name: 'documented', type: 'number', label: 'Documented', hideInTable: true },
      { name: 'discovered', type: 'text', label: 'Discovered', hideInTable: true },
      { name: 'lastTested', type: 'text', label: 'Last Tested', hideInTable: true },
      { name: 'timesUsed', type: 'number', label: 'Times Used', hideInTable: true },
      { name: 'successCount', type: 'number', label: 'Success Count', hideInTable: true },
      { name: 'failCount', type: 'number', label: 'Fail Count', hideInTable: true }
    ]
  },
  {
    name: 'Rooms',
    endpoint: 'rooms',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'zone_id', type: 'number', label: 'Zone', custom: 'zone_name_link' },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'exits', type: 'custom', label: 'Exits', custom: 'room_exits' }
    ]
  },
  {
    name: 'NPCs',
    endpoint: 'npcs',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'level', type: 'number', label: 'Level' },
      { name: 'race', type: 'text', label: 'Race' },
      { name: 'class', type: 'text', label: 'Class' },
      { name: 'hostile', type: 'number', label: 'Hostile' },
      { name: 'location', type: 'text', label: 'Location' },
      { name: 'description', type: 'textarea', label: 'Description', hideInTable: true },
      { name: 'dialogue', type: 'json', label: 'Dialogue', hideInTable: true },
      { name: 'rawText', type: 'textarea', label: 'Raw Text', hideInTable: true }
    ]
  },
  {
    name: 'Items',
    endpoint: 'items',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'text', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'type', type: 'text', label: 'Type' },
      { name: 'description', type: 'custom', label: 'Description', custom: 'itemDescription' },
      { name: 'attributes', type: 'custom', label: 'Attributes', custom: 'itemAttributes' },
      { name: 'material', type: 'text', label: 'Material', hideInTable: true },
      { name: 'size', type: 'text', label: 'Size', hideInTable: true },
      { name: 'weight', type: 'number', label: 'Weight', hideInTable: true },
      { name: 'value', type: 'number', label: 'Value', hideInTable: true },
      { name: 'stats', type: 'json', label: 'Stats', hideInTable: true },
      { name: 'properties', type: 'json', label: 'Properties', hideInTable: true },
      { name: 'rawText', type: 'textarea', label: 'Raw Text', hideInTable: true }
    ]
  },
  {
    name: 'Spells',
    endpoint: 'spells',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'type', type: 'text', label: 'Type' },
      { name: 'level', type: 'number', label: 'Level' },
      { name: 'manaCost', type: 'number', label: 'Mana Cost' },
      { name: 'description', type: 'textarea', label: 'Description', hideInTable: true },
      { name: 'effects', type: 'json', label: 'Effects', hideInTable: true },
      { name: 'rawText', type: 'textarea', label: 'Raw Text', hideInTable: true }
    ]
  }
];

// Helper function to singularize entity names
function getSingularName(pluralName: string): string {
  if (pluralName.endsWith('ies')) {
    return pluralName.slice(0, -3) + 'y';
  }
  if (pluralName.endsWith('sses') || pluralName.endsWith('xes')) {
    return pluralName.slice(0, -2);
  }
  if (pluralName.endsWith('s')) {
    return pluralName.slice(0, -1);
  }
  return pluralName;
}

function Admin() {
  const location = useLocation();
  const [selectedEntity, setSelectedEntity] = useState<EntityConfig>(ENTITY_CONFIGS[0]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [abilityScores, setAbilityScores] = useState<any[]>([]);
  const [selectedAbility, setSelectedAbility] = useState<Entity | null>(null);
  const [zoneAreas, setZoneAreas] = useState<any[]>([]);
  const [zoneConnections, setZoneConnections] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<Entity | null>(null);
  const [zoneRooms, setZoneRooms] = useState<Entity[]>([]);
  const [allZones, setAllZones] = useState<Entity[]>([]);
  const [allRooms, setAllRooms] = useState<Entity[]>([]);
  const [roomExits, setRoomExits] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Entity | null>(null);
  const [selectedAction, setSelectedAction] = useState<Entity | null>(null);
  const [selectedNPC, setSelectedNPC] = useState<Entity | null>(null);
  const [selectedItem, setSelectedItem] = useState<Entity | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<Entity | null>(null);

  // Reset all drilled-in states when navigating to /admin
  useEffect(() => {
    setSelectedZone(null);
    setSelectedRoom(null);
    setSelectedAction(null);
    setSelectedAbility(null);
    setSelectedNPC(null);
    setSelectedItem(null);
    setSelectedSpell(null);
    setShowScores(false);
    setShowForm(false);
    setEditingEntity(null);
  }, [location.pathname]);

  useEffect(() => {
    loadEntities();
  }, [selectedEntity]);

  const loadEntities = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/${selectedEntity.endpoint}`);
      setEntities(data);

      // If loading zones, also load zone areas and connections
      if (selectedEntity.endpoint === 'zones') {
        const [areas, connections] = await Promise.all([
          api.get('/zone_areas'),
          api.get('/zone_connections')
        ]);
        setZoneAreas(areas);
        setZoneConnections(connections);
      }

      // If loading rooms, also load zones for zone name lookup
      if (selectedEntity.endpoint === 'rooms') {
        const [zones, exits] = await Promise.all([api.get('/zones'), api.get('/room_exits')]);
        setAllZones(zones);
        setAllRooms(data);
        setRoomExits(exits);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEntity(null);
    setFormData({});
    setShowForm(true);
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData({ ...entity });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await api.delete(`/${selectedEntity.endpoint}/${id}`);
      loadEntities();
    } catch (error) {
      console.error('Error deleting entity:', error);
      alert('Failed to delete entity');
    }
  };

  const handleViewScores = async (ability: Entity) => {
    setSelectedAbility(ability);
    setShowScores(true);
    try {
      const scores = await api.get(`/ability_scores?ability_id=${ability.id}`);
      setAbilityScores(scores);
    } catch (error) {
      console.error('Error loading ability scores:', error);
      setAbilityScores([]);
    }
  };

  const handleZoneClick = async (zone: Entity) => {
    setSelectedZone(zone);
    try {
      const [rooms, exits] = await Promise.all([
        api.get(`/rooms?zone_id=${zone.id}`),
        api.get('/room_exits')
      ]);
      setZoneRooms(rooms);
      setAllRooms(rooms);
      setRoomExits(exits);
    } catch (error) {
      console.error('Error loading zone rooms:', error);
      setZoneRooms([]);
    }
  };

  const handleBackToZones = () => {
    setSelectedZone(null);
    setZoneRooms([]);
  };

  const handleRoomClick = async (room: Entity) => {
    setSelectedRoom(room);
    // If we don't have exits loaded, load them
    if (roomExits.length === 0) {
      try {
        const exits = await api.get('/room_exits');
        setRoomExits(exits);
      } catch (error) {
        console.error('Error loading room exits:', error);
      }
    }
    // Add this room to allRooms if not already there
    setAllRooms(prev => {
      if (!prev.find(r => r.id === room.id)) {
        return [...prev, room];
      }
      return prev;
    });
  };

  const handleBackToRooms = () => {
    setSelectedRoom(null);
  };

  const handleActionClick = (action: Entity) => {
    setSelectedAction(action);
  };

  const handleBackToActions = () => {
    setSelectedAction(null);
  };

  const handleNPCClick = (npc: Entity) => {
    setSelectedNPC(npc);
  };

  const handleBackToNPCs = () => {
    setSelectedNPC(null);
  };

  const handleItemClick = (item: Entity) => {
    setSelectedItem(item);
  };

  const handleBackToItems = () => {
    setSelectedItem(null);
  };

  const handleSpellClick = (spell: Entity) => {
    setSelectedSpell(spell);
  };

  const handleBackToSpells = () => {
    setSelectedSpell(null);
  };

  const handleEntityClick = (entity: Entity) => {
    if (selectedEntity.endpoint === 'zones') {
      handleZoneClick(entity);
    } else if (selectedEntity.endpoint === 'rooms') {
      handleRoomClick(entity);
    } else if (selectedEntity.endpoint === 'player_actions') {
      handleActionClick(entity);
    } else if (selectedEntity.endpoint === 'npcs') {
      handleNPCClick(entity);
    } else if (selectedEntity.endpoint === 'items') {
      handleItemClick(entity);
    } else if (selectedEntity.endpoint === 'spells') {
      handleSpellClick(entity);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Process JSON fields
      const processedData = { ...formData };
      selectedEntity.fields.forEach(field => {
        if (field.type === 'json' && typeof processedData[field.name] === 'string') {
          try {
            processedData[field.name] = JSON.parse(processedData[field.name]);
          } catch {
            // Leave as string if invalid JSON
          }
        }
      });

      if (editingEntity) {
        // Update
        await api.put(`/${selectedEntity.endpoint}/${editingEntity.id}`, processedData);
      } else {
        // Create
        await api.post(`/${selectedEntity.endpoint}`, processedData);
      }

      setShowForm(false);
      loadEntities();
    } catch (error) {
      console.error('Error saving entity:', error);
      alert('Failed to save entity');
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [fieldName]: value }));
  };

  const renderFieldValue = (
    entity: Entity,
    field: { name: string; type: string; custom?: string }
  ) => {
    const value = entity[field.name];

    // Special handling for zone_name custom field
    if (field.custom === 'zone_name') {
      const zone = allZones.find(z => z.id === value);
      return zone ? zone.name : value;
    }

    // Special handling for zone_name_link custom field
    if (field.custom === 'zone_name_link') {
      const zone = allZones.find(z => z.id === value);
      if (!zone) {
        return value;
      }
      return (
        <a
          href="#"
          className="zone-link"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            // Switch to Zones entity and open that zone's detail view
            const zonesConfig = ENTITY_CONFIGS.find(c => c.endpoint === 'zones');
            if (zonesConfig) {
              setSelectedEntity(zonesConfig);
              setTimeout(() => handleZoneClick(zone), 100);
            }
          }}
        >
          {zone.name}
        </a>
      );
    }

    // Special handling for item description custom field
    if (field.custom === 'itemDescription') {
      const parts: string[] = [];
      
      // Build a descriptive summary
      if (entity.material && entity.type) {
        parts.push(`${entity.material} ${entity.type.toLowerCase()}`);
      } else if (entity.type) {
        parts.push(entity.type.toLowerCase());
      }
      
      // Add weapon/armor specifics
      if (entity.properties && typeof entity.properties === 'object') {
        const props = entity.properties;
        if (props.weaponType) {
          parts.push(`(${props.weaponType})`);
        }
        if (props.consumableType) {
          parts.push(`(${props.consumableType})`);
        }
        if (props.lightIntensity) {
          parts.push(`(${props.lightIntensity} intensity)`);
        }
        if (props.spellEffects && Array.isArray(props.spellEffects) && props.spellEffects.length > 0) {
          const spell = props.spellEffects[0];
          parts.push(`(${spell.spell})`);
        }
      }
      
      if (parts.length === 0) {
        return <em className="text-gray">—</em>;
      }
      
      return parts.join(' ');
    }

    // Special handling for item attributes custom field
    if (field.custom === 'itemAttributes') {
      const attributes: string[] = [];
      
      // Add material and size
      if (entity.material) {
        attributes.push(entity.material);
      }
      if (entity.size && entity.size !== 'special') {
        attributes.push(entity.size);
      }
      
      // Add key stats
      if (entity.stats && typeof entity.stats === 'object') {
        const stats = entity.stats;
        if (stats.armor) attributes.push(`AP+${stats.armor}`);
        if (stats.damage) attributes.push(stats.damage);
        if (stats.averageDamage) attributes.push(`Avg: ${stats.averageDamage}`);
        if (stats.HITROLL) attributes.push(`HR+${stats.HITROLL}`);
        if (stats.MAXHIT) attributes.push(`HP+${stats.MAXHIT}`);
      }
      
      // Add important flags
      if (entity.properties && typeof entity.properties === 'object') {
        const props = entity.properties;
        if (props.flags && Array.isArray(props.flags)) {
          const importantFlags = props.flags.filter((f: string) => 
            ['MAGIC', 'UNIQUE', 'CURSED', 'UNBREAKABLE'].includes(f)
          );
          importantFlags.forEach((flag: string) => attributes.push(flag));
        }
      }
      
      if (attributes.length === 0) {
        return <em className="text-gray">—</em>;
      }
      
      return (
        <div className="item-attributes">
          {attributes.map((attr, idx) => (
            <span key={idx} className="tag small">{attr}</span>
          ))}
        </div>
      );
    }

    // Special handling for room_exits custom field
    if (field.custom === 'room_exits') {
      const exits = roomExits.filter(exit => exit.from_room_id === entity.id);
      if (exits.length === 0) {
        return <em className="text-gray">No exits</em>;
      }

      // Sort exits by direction
      const directionOrder: { [key: string]: number } = {
        north: 1,
        northeast: 2,
        east: 3,
        southeast: 4,
        south: 5,
        southwest: 6,
        west: 7,
        northwest: 8,
        up: 9,
        down: 10
      };
      exits.sort(
        (a, b) => (directionOrder[a.direction] || 99) - (directionOrder[b.direction] || 99)
      );

      return (
        <div className="room-exits">
          {exits.map((exit, idx) => {
            const toRoom = entities.find(r => r.id === exit.to_room_id);
            const exitText = exit.to_room_id
              ? `${exit.direction} → ${toRoom?.name || `Room ${exit.to_room_id}`}`
              : `${exit.direction} (unimplemented)`;
            return (
              <div key={idx} className="exit-item">
                {exitText}
              </div>
            );
          })}
        </div>
      );
    }

    // Special handling for combined zone info column in Zones table
    if (field.name === 'zone_info_combined') {
      const parts = [];

      // Add author
      if (entity.author) {
        parts.push(`Author: ${entity.author}`);
      }

      // Add difficulty
      if (entity.difficulty !== null && entity.difficulty !== undefined) {
        const difficultyStars = '★'.repeat(entity.difficulty) + '☆'.repeat(5 - entity.difficulty);
        parts.push(`Difficulty: ${difficultyStars} (${entity.difficulty}/5)`);
      }

      // Add areas
      const areas = zoneAreas.filter(area => area.zone_id === entity.id);
      if (areas.length > 0) {
        parts.push('Areas:');
        areas.forEach(area => {
          const levelRange =
            area.min_level && area.max_level
              ? `${area.min_level}-${area.max_level}`
              : area.min_level
                ? `${area.min_level}+`
                : 'Legend';
          parts.push(`  • ${area.name} (${levelRange})`);
        });
      }

      // Add connections
      const connections = zoneConnections.filter(conn => conn.zone_id === entity.id);
      if (connections.length > 0) {
        const connectedZoneIds = connections
          .map(conn => conn.connected_zone_id)
          .sort((a, b) => a - b);
        const connectedZoneDetails = connectedZoneIds.map(id => {
          const zone = entities.find(z => z.id === id);
          return zone ? `${id}: ${zone.name}` : `${id}`;
        });
        parts.push({ text: 'Connected Zones:', small: false });
        connectedZoneDetails.forEach(detail => {
          parts.push({ text: `  • ${detail}`, small: true });
        });
      }

      if (parts.length === 0) {
        return <em className="text-gray">—</em>;
      }

      return (
        <div className="zone-info-combined">
          {parts.map((part, idx) => (
            <div key={idx} className={typeof part === 'object' && part.small ? 'small-text' : ''}>
              {typeof part === 'object' ? part.text : part}
            </div>
          ))}
        </div>
      );
    }

    // Special handling for combined stats column in Classes table
    if (field.name === 'stats_combined') {
      const parts = [];
      if (entity.alignment_requirement) {
        parts.push(`Alignment: ${entity.alignment_requirement}`);
      }
      if (entity.hp_regen !== null && entity.hp_regen !== undefined) {
        parts.push(`HP Regen: ${entity.hp_regen}`);
      }
      if (entity.mana_regen !== null && entity.mana_regen !== undefined) {
        parts.push(`Mana Regen: ${entity.mana_regen}`);
      }
      if (entity.move_regen !== null && entity.move_regen !== undefined) {
        parts.push(`Move Regen: ${entity.move_regen}`);
      }

      if (parts.length === 0) {
        return <em className="text-gray">—</em>;
      }

      return (
        <div className="stats-combined">
          {parts.map((part, idx) => (
            <div key={idx}>{part}</div>
          ))}
        </div>
      );
    }

    if (field.type === 'json') {
      if (value === null || value === undefined) {
        return <em className="text-gray">null</em>;
      }
      return <code className="json-preview">{JSON.stringify(value)}</code>;
    }

    if (value === null || value === undefined || value === '') {
      return <em className="text-gray">—</em>;
    }

    // Render HTML for description fields
    if (field.name === 'description' && typeof value === 'string') {
      return <span dangerouslySetInnerHTML={{ __html: value }} />;
    }

    // Don't truncate description or special_notes fields
    if (
      typeof value === 'string' &&
      value.length > 50 &&
      field.name !== 'description' &&
      field.name !== 'special_notes'
    ) {
      return value.substring(0, 50) + '...';
    }

    return value;
  };

  return (
    <div className="page admin-page">
      <h2>Admin Panel</h2>

      {/* Room Detail View */}
      {selectedRoom ? (
        <div className="room-detail-view">
          <div className="room-detail-header">
            <button className="btn-back" onClick={handleBackToRooms}>
              ← Back to Rooms
            </button>
            <h3>Room: {selectedRoom.name}</h3>
          </div>

          <div className="room-detail-info">
            <p>
              <strong>Description:</strong> {selectedRoom.description}
            </p>
            {selectedRoom.terrain && (
              <p>
                <strong>Terrain:</strong> {selectedRoom.terrain}
              </p>
            )}
            {selectedRoom.flags && (
              <p>
                <strong>Flags:</strong> {selectedRoom.flags}
              </p>
            )}
            {selectedRoom.zone_id && (
              <p>
                <strong>Zone:</strong>{' '}
                <a
                  href="#"
                  className="zone-link"
                  onClick={e => {
                    e.preventDefault();
                    const zone = allZones.find(z => z.id === selectedRoom.zone_id);
                    if (zone) {
                      const zonesConfig = ENTITY_CONFIGS.find(c => c.endpoint === 'zones');
                      if (zonesConfig) {
                        setSelectedRoom(null);
                        setSelectedEntity(zonesConfig);
                        setTimeout(() => handleZoneClick(zone), 100);
                      }
                    }
                  }}
                >
                  {allZones.find(z => z.id === selectedRoom.zone_id)?.name || selectedRoom.zone_id}
                </a>
              </p>
            )}
          </div>

          <div className="room-exits-section">
            <h4>Exits</h4>
            {(() => {
              const exits = roomExits.filter(exit => exit.from_room_id === selectedRoom.id);
              const directionOrder: { [key: string]: number } = {
                north: 1,
                northeast: 2,
                east: 3,
                southeast: 4,
                south: 5,
                southwest: 6,
                west: 7,
                northwest: 8,
                up: 9,
                down: 10
              };
              exits.sort(
                (a, b) => (directionOrder[a.direction] || 99) - (directionOrder[b.direction] || 99)
              );

              if (exits.length === 0) {
                return <p className="empty-message">No exits from this room.</p>;
              }

              return (
                <div className="entity-table-container">
                  <table className="entity-table">
                    <thead>
                      <tr>
                        <th>Direction</th>
                        <th>Destination</th>
                        <th>Description</th>
                        <th>Door</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exits.map(exit => (
                        <tr key={exit.id}>
                          <td>{exit.direction}</td>
                          <td>
                            {exit.to_room_id ? (
                              <a
                                href="#"
                                className="zone-link"
                                onClick={async e => {
                                  e.preventDefault();
                                  // First check allRooms
                                  let room = allRooms.find(r => r.id === exit.to_room_id);
                                  // If not found, fetch it
                                  if (!room) {
                                    try {
                                      const rooms = await api.get(`/rooms?id=${exit.to_room_id}`);
                                      if (rooms && rooms.length > 0) {
                                        room = rooms[0];
                                        setAllRooms(prev => [...prev, room!]);
                                      }
                                    } catch (error) {
                                      console.error('Error loading room:', error);
                                    }
                                  }
                                  if (room) {
                                    handleRoomClick(room);
                                  }
                                }}
                              >
                                {allRooms.find(r => r.id === exit.to_room_id)?.name ||
                                  `Room ${exit.to_room_id}`}
                              </a>
                            ) : (
                              <em className="text-gray">Unimplemented</em>
                            )}
                          </td>
                          <td>{exit.description || '—'}</td>
                          <td>
                            {exit.is_door ? (
                              <>
                                {exit.door_name || 'Door'}
                                {exit.is_locked ? ' (locked)' : ''}
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : selectedAction ? (
        <div className="action-detail-view">
          <div className="action-detail-header">
            <button className="btn-back" onClick={handleBackToActions}>
              ← Back to Player Actions
            </button>
            <h3>Action: {selectedAction.name}</h3>
          </div>

          <div className="action-detail-info">
            <p>
              <strong>Type:</strong>{' '}
              <span className="action-type-badge">{selectedAction.type}</span>
            </p>
            {selectedAction.category && (
              <p>
                <strong>Category:</strong> {selectedAction.category}
              </p>
            )}
            {selectedAction.levelRequired && (
              <p>
                <strong>Level Required:</strong> {selectedAction.levelRequired}
              </p>
            )}

            {selectedAction.description && (
              <div className="action-description">
                <strong>Description:</strong>
                <pre>{selectedAction.description}</pre>
              </div>
            )}

            {selectedAction.syntax && (
              <div className="action-syntax">
                <strong>Syntax:</strong>
                <pre>{selectedAction.syntax}</pre>
              </div>
            )}

            {selectedAction.examples && (
              <div className="action-examples">
                <strong>Examples:</strong>
                <pre>{selectedAction.examples}</pre>
              </div>
            )}

            {selectedAction.requirements && (
              <p>
                <strong>Requirements:</strong> {selectedAction.requirements}
              </p>
            )}
            {selectedAction.relatedActions && (
              <p>
                <strong>Related Actions:</strong> {selectedAction.relatedActions}
              </p>
            )}
          </div>

          <div className="action-stats-section">
            <h4>Statistics</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Documented:</span>
                <span className="stat-value">{selectedAction.documented ? 'Yes' : 'No'}</span>
              </div>
              {selectedAction.discovered && (
                <div className="stat-item">
                  <span className="stat-label">Discovered:</span>
                  <span className="stat-value">
                    {new Date(selectedAction.discovered).toLocaleDateString()}
                  </span>
                </div>
              )}
              {selectedAction.lastTested && (
                <div className="stat-item">
                  <span className="stat-label">Last Tested:</span>
                  <span className="stat-value">
                    {new Date(selectedAction.lastTested).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="stat-item">
                <span className="stat-label">Times Used:</span>
                <span className="stat-value">{selectedAction.timesUsed || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Success Count:</span>
                <span className="stat-value">{selectedAction.successCount || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Fail Count:</span>
                <span className="stat-value">{selectedAction.failCount || 0}</span>
              </div>
              {(selectedAction.successCount > 0 || selectedAction.failCount > 0) && (
                <div className="stat-item">
                  <span className="stat-label">Success Rate:</span>
                  <span className="stat-value">
                    {(
                      (selectedAction.successCount /
                        (selectedAction.successCount + selectedAction.failCount)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : selectedNPC ? (
        <div className="detail-view">
          <div className="detail-header">
            <button className="btn-back" onClick={handleBackToNPCs}>
              ← Back to NPCs
            </button>
            <h3>{selectedNPC.name}</h3>
          </div>

          <div className="detail-section">
            <h4>NPC Information</h4>
            <div className="detail-grid">
              {selectedNPC.level && (
                <div className="detail-item">
                  <span className="detail-label">Level:</span>
                  <span className="detail-value">{selectedNPC.level}</span>
                </div>
              )}
              {selectedNPC.race && (
                <div className="detail-item">
                  <span className="detail-label">Race:</span>
                  <span className="detail-value">{selectedNPC.race}</span>
                </div>
              )}
              {selectedNPC.class && (
                <div className="detail-item">
                  <span className="detail-label">Class:</span>
                  <span className="detail-value">{selectedNPC.class}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Disposition:</span>
                <span className="detail-value">
                  <span className={`tag ${selectedNPC.hostile ? 'hostile' : 'friendly'}`}>
                    {selectedNPC.hostile ? 'Hostile' : 'Friendly'}
                  </span>
                </span>
              </div>
              {selectedNPC.location && (
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selectedNPC.location}</span>
                </div>
              )}
            </div>

            {selectedNPC.description && (
              <div className="detail-item full-width" style={{ marginTop: '15px' }}>
                <span className="detail-label">Description:</span>
                <div className="detail-description">{selectedNPC.description}</div>
              </div>
            )}
          </div>

          {selectedNPC.dialogue && Array.isArray(JSON.parse(selectedNPC.dialogue || '[]')) && JSON.parse(selectedNPC.dialogue || '[]').length > 0 && (
            <div className="detail-section">
              <h4>Dialogue</h4>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                {JSON.parse(selectedNPC.dialogue).map((line: string, index: number) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedNPC.rawText && (
            <div className="detail-section">
              <h4>Raw MUD Text</h4>
              <pre className="raw-text">{selectedNPC.rawText}</pre>
            </div>
          )}
        </div>
      ) : selectedItem ? (
        <div className="detail-view">
          <div className="detail-header">
            <button className="btn-back" onClick={handleBackToItems}>
              ← Back to Items
            </button>
            <h3>{selectedItem.name}</h3>
          </div>

          <div className="detail-section">
            <h4>Item Information</h4>
            <div className="detail-grid">
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

          {selectedItem.stats && typeof selectedItem.stats === 'object' && Object.keys(selectedItem.stats).length > 0 && (
            <div className="detail-section">
              <h4>Stats</h4>
              <div className="detail-grid">
                {Object.entries(selectedItem.stats).map(([key, value]) => (
                  <div key={key} className="detail-item">
                    <span className="detail-label">{key}:</span>
                    <span className="detail-value">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedItem.properties && typeof selectedItem.properties === 'object' && Object.keys(selectedItem.properties).length > 0 && (
            <div className="detail-section">
              <h4>Properties</h4>
              <div className="detail-grid">
                {Object.entries(selectedItem.properties).map(([key, value]) => (
                  <div key={key} className="detail-item">
                    <span className="detail-label">{key}:</span>
                    <span className="detail-value">
                      {Array.isArray(value) 
                        ? value.join(', ')
                        : typeof value === 'object' 
                          ? JSON.stringify(value, null, 2) 
                          : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedItem.rawText && (
            <div className="detail-section">
              <h4>Raw MUD Text</h4>
              <pre className="raw-text">{selectedItem.rawText}</pre>
            </div>
          )}
        </div>
      ) : selectedSpell ? (
        <div className="detail-view">
          <div className="detail-header">
            <button className="btn-back" onClick={handleBackToSpells}>
              ← Back to Spells
            </button>
            <h3>{selectedSpell.name}</h3>
          </div>

          <div className="detail-section">
            <h4>Spell Information</h4>
            <div className="detail-grid">
              {selectedSpell.type && (
                <div className="detail-item">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">
                    <span className="tag">{selectedSpell.type}</span>
                  </span>
                </div>
              )}
              {selectedSpell.level !== undefined && (
                <div className="detail-item">
                  <span className="detail-label">Level:</span>
                  <span className="detail-value">{selectedSpell.level}</span>
                </div>
              )}
              {selectedSpell.manaCost !== undefined && (
                <div className="detail-item">
                  <span className="detail-label">Mana Cost:</span>
                  <span className="detail-value">{selectedSpell.manaCost}</span>
                </div>
              )}
            </div>

            {selectedSpell.description && (
              <div className="detail-item full-width" style={{ marginTop: '15px' }}>
                <span className="detail-label">Description:</span>
                <div className="detail-description">{selectedSpell.description}</div>
              </div>
            )}
          </div>

          {selectedSpell.effects && Array.isArray(JSON.parse(selectedSpell.effects || '[]')) && JSON.parse(selectedSpell.effects || '[]').length > 0 && (
            <div className="detail-section">
              <h4>Effects</h4>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                {JSON.parse(selectedSpell.effects).map((effect: string, index: number) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {effect}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedSpell.rawText && (
            <div className="detail-section">
              <h4>Raw MUD Text</h4>
              <pre className="raw-text">{selectedSpell.rawText}</pre>
            </div>
          )}
        </div>
      ) : selectedZone ? (
        <div className="zone-detail-view">
          <div className="zone-detail-header">
            <button className="btn-back" onClick={handleBackToZones}>
              ← Back to Zones
            </button>
            <h3>
              Zone #{selectedZone.id}: {selectedZone.name}
            </h3>
          </div>

          <div className="zone-detail-info">
            <p>
              <strong>Description:</strong> {selectedZone.description}
            </p>
            {selectedZone.author && (
              <p>
                <strong>Author:</strong> {selectedZone.author}
              </p>
            )}
            {selectedZone.difficulty && (
              <p>
                <strong>Difficulty:</strong> {'★'.repeat(selectedZone.difficulty)}
                {'☆'.repeat(5 - selectedZone.difficulty)} ({selectedZone.difficulty}/5)
              </p>
            )}
            {selectedZone.notes && (
              <p>
                <strong>Notes:</strong> {selectedZone.notes}
              </p>
            )}
          </div>

          <div className="zone-rooms-section">
            <h4>Rooms in this Zone ({zoneRooms.length})</h4>
            {zoneRooms.length === 0 ? (
              <p className="empty-message">No rooms found in this zone.</p>
            ) : (
              <div className="entity-table-container">
                <table className="entity-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Exits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoneRooms.map(room => {
                      const exits = roomExits.filter(exit => exit.from_room_id === room.id);
                      const directionOrder: { [key: string]: number } = {
                        north: 1,
                        northeast: 2,
                        east: 3,
                        southeast: 4,
                        south: 5,
                        southwest: 6,
                        west: 7,
                        northwest: 8,
                        up: 9,
                        down: 10
                      };
                      exits.sort(
                        (a, b) =>
                          (directionOrder[a.direction] || 99) - (directionOrder[b.direction] || 99)
                      );

                      return (
                        <tr
                          key={room.id}
                          className="clickable-row"
                          onClick={() => handleRoomClick(room)}
                        >
                          <td>{room.name}</td>
                          <td>
                            {exits.length === 0 ? (
                              <em className="text-gray">No exits</em>
                            ) : (
                              <div className="room-exits">
                                {exits.map((exit, idx) => {
                                  const toRoom = zoneRooms.find(r => r.id === exit.to_room_id);
                                  const exitText = exit.to_room_id
                                    ? `${exit.direction} → ${toRoom?.name || `Room ${exit.to_room_id}`}`
                                    : `${exit.direction} (unimplemented)`;
                                  return (
                                    <div key={idx} className="exit-item">
                                      {exitText}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-container">
          {/* Entity Selector */}
          <div className="entity-selector">
            <h3>Entity Types</h3>
            {ENTITY_CONFIGS.map(config => (
              <button
                key={config.endpoint}
                className={`entity-button ${selectedEntity.endpoint === config.endpoint ? 'active' : ''}`}
                onClick={() => setSelectedEntity(config)}
              >
                {config.name}
              </button>
            ))}
          </div>

          {/* Entity List */}
          <div className="entity-content">
            <div className="entity-header">
              <h3>{selectedEntity.name}</h3>
              {!selectedEntity.readOnly && (
                <button className="btn-primary" onClick={handleCreate}>
                  + Create New
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="entity-table-container">
                <table className="entity-table">
                  <thead>
                    <tr>
                      {selectedEntity.fields
                        .filter(f => !f.hideInTable)
                        .map(field => (
                          <th key={field.name}>{field.label}</th>
                        ))}
                      {!selectedEntity.readOnly && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {entities.length === 0 ? (
                      <tr>
                        <td
                          colSpan={
                            selectedEntity.fields.filter(f => !f.hideInTable).length +
                            (!selectedEntity.readOnly ? 1 : 0)
                          }
                          className="empty-cell"
                        >
                          No {selectedEntity.name.toLowerCase()} found. Click &quot;Create New&quot;
                          to add one.
                        </td>
                      </tr>
                    ) : (
                      entities.map(entity => (
                        <tr
                          key={entity.id}
                          className={selectedEntity.clickable ? 'clickable-row' : ''}
                          onClick={() => selectedEntity.clickable && handleEntityClick(entity)}
                        >
                          {selectedEntity.fields
                            .filter(f => !f.hideInTable)
                            .map(field => (
                              <td key={field.name} data-field={field.name}>
                                {renderFieldValue(entity, field)}
                              </td>
                            ))}
                          {!selectedEntity.readOnly && (
                            <td className="actions-cell">
                              {selectedEntity.endpoint === 'abilities' ? (
                                <button
                                  className="btn-small"
                                  onClick={() => handleViewScores(entity)}
                                >
                                  View Scores
                                </button>
                              ) : (
                                <>
                                  <button
                                    className="btn-small btn-edit"
                                    onClick={() => handleEdit(entity)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn-small btn-delete"
                                    onClick={() => handleDelete(entity.id)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit/Create Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>
              {editingEntity ? 'Edit' : 'Create'} {getSingularName(selectedEntity.name)}
            </h3>

            <form onSubmit={handleSubmit}>
              {selectedEntity.fields.map(field => (
                <div key={field.name} className="form-group">
                  <label>
                    {field.label}
                    {field.required && <span className="required">*</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={e => handleFieldChange(field.name, e.target.value)}
                      required={field.required}
                      rows={4}
                    />
                  ) : field.type === 'json' ? (
                    <textarea
                      value={
                        typeof formData[field.name] === 'string'
                          ? formData[field.name]
                          : JSON.stringify(formData[field.name], null, 2) || ''
                      }
                      onChange={e => handleFieldChange(field.name, e.target.value)}
                      placeholder='{"key": "value"} or ["item1", "item2"]'
                      rows={4}
                      className="json-input"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.name] || ''}
                      onChange={e => handleFieldChange(field.name, e.target.value)}
                      required={field.required}
                    />
                  )}
                </div>
              ))}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingEntity ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ability Scores Modal (Read-only) */}
      {showScores && (
        <div className="modal-overlay" onClick={() => setShowScores(false)}>
          <div className="modal-content scores-modal" onClick={e => e.stopPropagation()}>
            <h3>
              {selectedAbility?.name} ({selectedAbility?.short_name}) - Score Table
            </h3>

            {abilityScores.length === 0 ? (
              <p>No scores defined for this ability.</p>
            ) : (
              <>
                <div className="scores-table-container">
                  <table className="scores-table">
                    <thead>
                      <tr>
                        <th>Score</th>
                        {abilityScores[0] &&
                          Object.keys(abilityScores[0].effects).map(key => (
                            <th key={key}>
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {abilityScores.map(score => (
                        <tr key={score.id}>
                          <td>
                            <strong>{score.score}</strong>
                          </td>
                          {Object.values(score.effects).map((value: any, idx) => (
                            <td key={idx}>
                              {typeof value === 'number' && value > 0 ? `+${value}` : value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Show class bonus table for Charisma */}
                {selectedAbility?.short_name === 'CHA' && (
                  <div style={{ marginTop: '30px' }}>
                    <h4>Class Bonuses</h4>
                    <div className="scores-table-container">
                      <table className="scores-table">
                        <thead>
                          <tr>
                            <th>Necromancer</th>
                            <th>Mage</th>
                            <th>All Others</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <strong>+10</strong>
                            </td>
                            <td>
                              <strong>+5</strong>
                            </td>
                            <td>
                              <strong>0</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button className="btn-secondary" onClick={() => setShowScores(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
