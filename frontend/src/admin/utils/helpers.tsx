import React from 'react';
import { Entity, EntityConfig } from '../types';
import { ENTITY_CONFIGS } from '../entityConfigs';

// Helper function to singularize entity names
export function getSingularName(pluralName: string): string {
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

// Helper function to render field values with special formatting
export function renderFieldValue(
  entity: Entity,
  field: { name: string; type: string; custom?: string },
  allZones: Entity[] = [],
  entities: Entity[] = [],
  roomExits: any[] = [],
  zoneAreas: any[] = [],
  zoneConnections: any[] = [],
  setSelectedEntity?: (config: EntityConfig) => void,
  handleZoneClick?: (zone: Entity) => void
): React.ReactNode {
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
          if (zonesConfig && setSelectedEntity && handleZoneClick) {
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

  // Special handling for truncated description (e.g., player actions)
  if (field.custom === 'truncatedDescription') {
    if (!value || value === '') {
      return <em className="text-gray">—</em>;
    }
    
    const text = String(value);
    const maxLength = 400;
    
    if (text.length <= maxLength) {
      return <span>{text}</span>;
    }
    
    return (
      <span title={text}>
        {text.substring(0, maxLength)}...
      </span>
    );
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
}