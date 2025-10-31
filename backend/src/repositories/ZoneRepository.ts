import { BaseRepository, EntityConfig } from './BaseRepository.js';

export interface Zone {
  id: number;
  name: string;
  description?: string;
  author?: string;
  difficulty?: string;
  level_range?: string;
  recommended_classes?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZoneArea {
  id: number;
  zone_id: number;
  area_name: string;
  level_range?: string;
  recommended_classes?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZoneConnection {
  id: number;
  zone_id: number;
  connected_zone_id: number;
  connection_type?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const zoneConfig: EntityConfig = {
  table: 'zones',
  idField: 'id',
  nameField: 'name',
  autoIncrement: true,
  uniqueField: 'name',
  sortBy: 'id'
};

const areaConfig: EntityConfig = {
  table: 'zone_areas',
  idField: 'id',
  autoIncrement: true,
  sortBy: 'zone_id, id'
};

const connectionConfig: EntityConfig = {
  table: 'zone_connections',
  idField: 'id',
  autoIncrement: true,
  sortBy: 'zone_id, connected_zone_id'
};

export class ZoneRepository extends BaseRepository<Zone> {
  constructor() {
    super(zoneConfig);
  }
}

export class ZoneAreaRepository extends BaseRepository<ZoneArea> {
  constructor() {
    super(areaConfig);
  }
}

export class ZoneConnectionRepository extends BaseRepository<ZoneConnection> {
  constructor() {
    super(connectionConfig);
  }

  /**
   * Get all zones connected to a specific zone
   */
  async findConnectedZones(zoneId: number): Promise<number[]> {
    const connections = await this.findAll({ zone_id: zoneId });
    return connections.map(c => c.connected_zone_id);
  }

  /**
   * Check if two zones are connected
   */
  async areConnected(zone1Id: number, zone2Id: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count FROM ${this.config.table} 
      WHERE (zone_id = ? AND connected_zone_id = ?) 
         OR (zone_id = ? AND connected_zone_id = ?)
    `;
    return new Promise((resolve, reject) => {
      this.getDb().get(sql, [zone1Id, zone2Id, zone2Id, zone1Id], (err, row: any) => {
        if (err) {reject(err);}
        else {resolve(row?.count > 0);}
      });
    });
  }
}
