/**
 * Zone Service
 *
 * Encapsulates business logic for zone operations including:
 * - Zone retrieval and filtering
 * - Zone creation and updates
 * - Zone validation
 */

import { BaseService } from './BaseService';
import { repositories } from '../repositories';
import { Zone } from '../repositories/ZoneRepository';
import { createNotFoundError, BadRequestError } from '../errors/CustomErrors';

export class ZoneService extends BaseService {
  /**
   * Get all zones
   */
  async getZones(): Promise<Zone[]> {
    return await repositories.zones.findAll();
  }

  /**
   * Get a single zone by ID
   */
  async getZoneById(id: number): Promise<Zone> {
    this.validatePositiveInteger(id, 'zone_id');
    return await repositories.zones.findByIdOrThrow(id.toString(), 'Zone');
  }

  /**
   * Get a zone by its name
   */
  async getZoneByName(name: string): Promise<Zone> {
    this.validateNonEmptyString(name, 'Zone name');
    return await repositories.zones.findByUniqueOrThrow(name, 'Zone');
  }

  /**
   * Create a new zone
   */
  async createZone(zoneData: Partial<Zone>): Promise<Zone> {
    // Validate required fields
    this.validateNonEmptyString(zoneData.name, 'Zone name');

    // After validation, we know name is defined
    const name = zoneData.name!;

    // Check if zone with this name already exists
    const existing = await repositories.zones.findByUnique(name);
    if (existing) {
      throw new BadRequestError(`Zone with name "${zoneData.name}" already exists`);
    }

    return await repositories.zones.create(zoneData);
  }

  /**
   * Update an existing zone
   */
  async updateZone(id: number, updates: Partial<Zone>): Promise<Zone> {
    this.validatePositiveInteger(id, 'zone_id');

    // Verify zone exists
    const existing = await repositories.zones.findByIdOrThrow(id.toString(), 'Zone');

    // If updating name, check for duplicates
    if (updates.name && updates.name !== existing.name) {
      const duplicate = await repositories.zones.findByUnique(updates.name);
      if (duplicate) {
        throw new BadRequestError(`Zone with name "${updates.name}" already exists`);
      }
    }

    const updated = await repositories.zones.update(id.toString(), updates);
    if (!updated) {
      throw new Error(`Failed to update zone ${id}`);
    }
    return updated;
  }

  /**
   * Delete a zone
   */
  async deleteZone(id: number): Promise<boolean> {
    this.validatePositiveInteger(id, 'zone_id');

    // Check if zone has associated rooms
    const rooms = await repositories.rooms.findAll({ zone_id: id });
    if (rooms.length > 0) {
      throw new BadRequestError(
        `Cannot delete zone ${id}: it has ${rooms.length} associated room(s)`,
        { roomCount: rooms.length }
      );
    }

    const deleted = await repositories.zones.delete(id.toString());

    if (!deleted) {
      throw createNotFoundError('Zone', id.toString());
    }

    return deleted;
  }

  /**
   * Get count of all zones
   */
  async getZoneCount(): Promise<number> {
    return await repositories.zones.count();
  }
}
