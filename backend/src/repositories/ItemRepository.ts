import { BaseRepository } from './BaseRepository';

interface ItemWithMetadata {
  id: string;
  name: string;
  vnum: number | null;
  type: string;
  material: string | null;
  min_level: number;
  size: string | null;
  weight: number | null;
  value: number | null;
  rent: number | null;
  location: string | null;
  description: string | null;
  long_description: string | null;
  rawText: string | null;
  identified: number;
  createdAt: string;
  updatedAt: string;
  stats?: {
    armor?: number;
    damage?: string;
    level?: number;
    weight?: number;
    value?: number;
    [key: string]: any;
  };
  properties?: {
    flags?: string[];
    wearLocations?: string[];
    binding?: string;
    weaponType?: string;
    armorType?: string;
    lightIntensity?: number;
    containerCapacity?: number;
    consumableType?: string;
    [key: string]: any;
  };
}

export class ItemRepository extends BaseRepository<ItemWithMetadata> {
  constructor() {
    super({
      table: 'items',
      idField: 'id',
      sortBy: 'name',
      autoIncrement: false
    });
  }

  /**
   * Get all items with their full metadata (stats, flags, wear locations, etc.)
   */
  async findAll(): Promise<ItemWithMetadata[]> {
    const items = await this.all(`
      SELECT 
        i.*,
        t.name as type,
        m.name as material,
        s.name as size
      FROM items i
      LEFT JOIN item_types t ON i.type_id = t.id
      LEFT JOIN item_materials m ON i.material_id = m.id
      LEFT JOIN item_sizes s ON i.size_id = s.id
      ORDER BY i.name
    `);

    // Enrich each item with metadata
    const enrichedItems = await Promise.all(
      items.map(item => this.enrichItemWithMetadata(item))
    );

    return enrichedItems;
  }

  /**
   * Get a single item by ID with full metadata
   */
  async findById(id: string): Promise<ItemWithMetadata | null> {
    const item: any = await this.get(
      `
      SELECT 
        i.*,
        t.name as type,
        m.name as material,
        s.name as size
      FROM items i
      LEFT JOIN item_types t ON i.type_id = t.id
      LEFT JOIN item_materials m ON i.material_id = m.id
      LEFT JOIN item_sizes s ON i.size_id = s.id
      WHERE i.id = ?
    `,
      [id]
    );

    if (!item) return null;

    return this.enrichItemWithMetadata(item);
  }

  /**
   * Enrich an item with all its related metadata from junction and type-specific tables
   */
  private async enrichItemWithMetadata(item: any): Promise<ItemWithMetadata> {
    const stats: any = {};
    const properties: any = {};

    // Get stat effects
    const statEffects: any[] = await this.all(
      `
      SELECT st.name, ise.modifier
      FROM item_stat_effects ise
      JOIN stat_types st ON ise.stat_type_id = st.id
      WHERE ise.item_id = ?
    `,
      [item.id]
    );

    statEffects.forEach((stat: any) => {
      stats[stat.name] = stat.modifier;
    });

    // Get flags
    const flags: any[] = await this.all(
      `
      SELECT f.name
      FROM item_flag_instances ifi
      JOIN item_flags f ON ifi.flag_id = f.id
      WHERE ifi.item_id = ?
    `,
      [item.id]
    );
    properties.flags = flags.map((f: any) => f.name);

    // Get wear locations
    const wearLocations: any[] = await this.all(
      `
      SELECT wl.name
      FROM item_wear_locations iwl
      JOIN wear_locations wl ON iwl.location_id = wl.id
      WHERE iwl.item_id = ?
    `,
      [item.id]
    );
    properties.wearLocations = wearLocations.map((wl: any) => wl.name);

    // Get binding type
    const binding: any = await this.get(
      `
      SELECT b.name
      FROM item_binding_instances ibi
      JOIN item_bindings b ON ibi.binding_type_id = b.id
      WHERE ibi.item_id = ?
    `,
      [item.id]
    );
    if (binding) {
      properties.binding = binding.name;
    }

    // Get type-specific data based on item type
    if (item.type === 'WEAPON') {
      const weapon: any = await this.get(
        `SELECT * FROM item_weapons WHERE item_id = ?`,
        [item.id]
      );
      if (weapon) {
        stats.damage = weapon.damage_dice;
        stats.averageDamage = weapon.average_damage;
        properties.weaponType = weapon.damage_type;
        properties.weaponSkill = weapon.weapon_skill;
        properties.handRequirement = weapon.hand_requirement;
      }
    } else if (item.type === 'ARMOR') {
      const armor: any = await this.get(
        `SELECT * FROM item_armor WHERE item_id = ?`,
        [item.id]
      );
      if (armor) {
        stats.armor = armor.armor_points;
        properties.armorType = armor.armor_type;
      }
    } else if (item.type === 'LIGHT') {
      const light: any = await this.get(
        `SELECT * FROM item_lights WHERE item_id = ?`,
        [item.id]
      );
      if (light) {
        properties.lightIntensity = light.light_intensity;
        properties.hoursRemaining = light.hours_remaining;
        properties.maxHours = light.max_hours;
        properties.refillable = light.refillable === 1;
      }
    } else if (item.type === 'CONTAINER') {
      const container: any = await this.get(
        `SELECT * FROM item_containers WHERE item_id = ?`,
        [item.id]
      );
      if (container) {
        properties.containerCapacity = container.max_items;
        properties.maxWeight = container.max_weight;
        properties.containerFlags = container.container_flags;
      }
    } else if (item.type === 'FOOD' || item.type === 'DRINK') {
      const consumable: any = await this.get(
        `SELECT * FROM item_consumables WHERE item_id = ?`,
        [item.id]
      );
      if (consumable) {
        properties.consumableType = consumable.consumable_type;
        properties.hungerRestored = consumable.hunger_restored;
        properties.thirstRestored = consumable.thirst_restored;
        properties.poisoned = consumable.poisoned === 1;
      }
    }

    // Get spell effects
    const spellEffects: any[] = await this.all(
      `SELECT * FROM item_spell_effects WHERE item_id = ?`,
      [item.id]
    );
    if (spellEffects.length > 0) {
      properties.spellEffects = spellEffects.map((se: any) => ({
        spell: se.spell_name,
        level: se.spell_level,
        charges: se.charges_current,
        maxCharges: se.charges_max
      }));
    }

    // Get granted abilities
    const abilities: any[] = await this.all(
      `SELECT * FROM item_granted_abilities WHERE item_id = ?`,
      [item.id]
    );
    if (abilities.length > 0) {
      properties.grantedAbilities = abilities.map((a: any) => ({
        name: a.ability_name,
        description: a.ability_description
      }));
    }

    // Add basic stats
    if (item.weight) stats.weight = item.weight;
    if (item.value) stats.value = item.value;
    if (item.min_level) stats.level = item.min_level;

    return {
      ...item,
      stats: Object.keys(stats).length > 0 ? stats : undefined,
      properties: Object.keys(properties).length > 0 ? properties : undefined
    };
  }
}
