import { useEffect, useState } from 'react';
import { Entity } from '../types';
import { NPCEquipment, NPCSpell, NPCDialogue, NPCPath, NPCSpawnInfo, NPCFlag, NPCFlagInstance } from '@shared/types';
import { api } from '../../api';

interface NPCDetailViewProps {
  selectedNPC: Entity;
  handleBackToNPCs: () => void;
}

export const NPCDetailView: React.FC<NPCDetailViewProps> = ({
  selectedNPC,
  handleBackToNPCs
}) => {
  const [equipmentDetails, setEquipmentDetails] = useState<any[]>([]);
  const [spells, setSpells] = useState<NPCSpell[]>([]);
  const [dialogue, setDialogue] = useState<NPCDialogue[]>([]);
  const [path, setPath] = useState<NPCPath[]>([]);
  const [spawnInfo, setSpawnInfo] = useState<NPCSpawnInfo | null>(null);
  const [activeFlags, setActiveFlags] = useState<NPCFlag[]>([]);

  useEffect(() => {
    loadNPCRelatedData();
  }, [selectedNPC.id]);

  const loadNPCRelatedData = async () => {
    try {
      const [equipmentData, spellsData, dialogueData, pathData, spawnData, flagInstances] = await Promise.all([
        api.get(`/npc_equipment?npc_id=${selectedNPC.id}`),
        api.get(`/npc_spells?npc_id=${selectedNPC.id}`),
        api.get(`/npc_dialogue?npc_id=${selectedNPC.id}`),
        api.get(`/npc_paths?npc_id=${selectedNPC.id}`),
        api.get(`/npc_spawn_info?npc_id=${selectedNPC.id}`),
        api.get(`/npc_flag_instances?npc_id=${selectedNPC.id}`),
      ]);

      // Load item and wear_location details for equipment
      if (equipmentData.length > 0) {
        const [items, wearLocations] = await Promise.all([
          api.get('/items'),
          api.get('/wear_locations')
        ]);
        
        const enrichedEquipment = equipmentData.map((eq: NPCEquipment) => {
          const item = items.find((i: any) => i.id === eq.item_id);
          const wearLocation = wearLocations.find((wl: any) => wl.id === eq.wear_location_id);
          return {
            ...eq,
            item_name: item?.name || 'Unknown Item',
            wear_location_name: wearLocation?.name || 'Unknown Slot'
          };
        });
        setEquipmentDetails(enrichedEquipment);
      } else {
        setEquipmentDetails([]);
      }
      
      setSpells(spellsData);
      setDialogue(dialogueData);
      setPath(pathData.sort((a: NPCPath, b: NPCPath) => a.sequence_order - b.sequence_order));
      setSpawnInfo(spawnData.length > 0 ? spawnData[0] : null);

      // Load full flag details for active flags
      if (flagInstances.length > 0) {
        const activeInstances = flagInstances.filter((fi: NPCFlagInstance) => fi.active);
        const flagIds = activeInstances.map((fi: NPCFlagInstance) => fi.flag_id);
        const allFlags = await api.get('/npc_flags');
        const activeFlagDetails = allFlags.filter((flag: NPCFlag) => flagIds.includes(flag.id));
        setActiveFlags(activeFlagDetails);
      } else {
        setActiveFlags([]);
      }
    } catch (error) {
      console.error('Error loading NPC related data:', error);
    }
  };

  const formatAlignment = (alignment?: number) => {
    if (alignment === undefined || alignment === null) return 'Unknown';
    if (alignment >= 350) return `Good (+${alignment})`;
    if (alignment <= -350) return `Evil (${alignment})`;
    return `Neutral (${alignment})`;
  };

  const getVisibilityStatus = () => {
    const statuses = [];
    if (selectedNPC.is_invisible) statuses.push('Invisible');
    if (selectedNPC.is_cloaked) statuses.push('Cloaked');
    if (selectedNPC.is_hidden) statuses.push('Hidden');
    return statuses.length > 0 ? statuses.join(', ') : 'Visible';
  };

  const getDataCollectionMethods = () => {
    const methods = [];
    if (selectedNPC.has_been_examined) methods.push('Examined');
    if (selectedNPC.has_been_considered) methods.push('Considered');
    if (selectedNPC.has_been_charmed) methods.push('Charmed');
    if (selectedNPC.has_reported_stats) methods.push('Report');
    if (selectedNPC.has_been_in_group) methods.push('Group');
    return methods.length > 0 ? methods.join(', ') : 'None';
  };

  const getConditionFromHP = (hpMax?: number) => {
    if (!hpMax) return 'Unknown';
    // Since we only store max HP (NPCs are templates), we assume full health
    return 'excellent condition';
  };

  const getFlagCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'status': return '#4a90e2';
      case 'debuff': return '#e24a4a';
      case 'behavior': return '#f39c12';
      case 'ability': return '#9b59b6';
      case 'immunity': return '#1abc9c';
      case 'special': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  return (
    <div className="detail-view-container">
      <button className="btn-back" onClick={handleBackToNPCs}>
        ← Back to NPCs
      </button>

      <div className="detail-view">
        <div className="detail-header">
          <h2>🧙 {selectedNPC.name}</h2>
          {selectedNPC.discovered === false && (
            <span className="badge badge-warning">Undiscovered</span>
          )}
        </div>

        {/* Basic Information */}
        <section className="detail-section">
          <h3>Basic Information</h3>
          <div className="detail-grid">
            {selectedNPC.short_desc && (
              <div className="detail-item full-width">
                <span className="detail-label">Short Description:</span>
                <span className="detail-value">{selectedNPC.short_desc}</span>
              </div>
            )}
            {selectedNPC.long_desc && (
              <div className="detail-item full-width">
                <span className="detail-label">Long Description:</span>
                <span className="detail-value">{selectedNPC.long_desc}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Level:</span>
              <span className="detail-value">{selectedNPC.level || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Race:</span>
              <span className="detail-value">{selectedNPC.race || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Class:</span>
              <span className="detail-value">{selectedNPC.class || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gender:</span>
              <span className="detail-value">{selectedNPC.gender || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Alignment:</span>
              <span className="detail-value">{formatAlignment(selectedNPC.alignment)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gold:</span>
              <span className="detail-value">{selectedNPC.gold !== undefined ? `${selectedNPC.gold} gold` : 'Unknown'}</span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="detail-section">
          <h3>Stats</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">HP:</span>
              <span className="detail-value">
                {selectedNPC.hp_max !== undefined ? selectedNPC.hp_max : 'Unknown'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Mana:</span>
              <span className="detail-value">
                {selectedNPC.mana_max !== undefined ? selectedNPC.mana_max : 'Unknown'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Moves:</span>
              <span className="detail-value">
                {selectedNPC.moves_max !== undefined ? selectedNPC.moves_max : 'Unknown'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">TNL:</span>
              <span className="detail-value">{selectedNPC.experience_to_next_level || 'Unknown'}</span>
            </div>
          </div>
        </section>

        {/* Combat Stats */}
        <section className="detail-section">
          <h3>Combat Stats</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Attacks/Round:</span>
              <span className="detail-value">{selectedNPC.attacks_per_round || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Hit Ability:</span>
              <span className="detail-value">{selectedNPC.hit_ability || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Damage Ability:</span>
              <span className="detail-value">{selectedNPC.damage_ability || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Magic Ability:</span>
              <span className="detail-value">{selectedNPC.magic_ability || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Armor Class:</span>
              <span className="detail-value">{selectedNPC.armor_class || 'Unknown'}</span>
            </div>
          </div>
        </section>

        {/* Behavior */}
        <section className="detail-section">
          <h3>Behavior</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Movement:</span>
              <span className="detail-value">{selectedNPC.is_stationary ? 'Stationary' : 'Mobile'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Aggression:</span>
              <span className="detail-value">
                {selectedNPC.is_aggressive ? (
                  <span className="badge badge-danger">Aggressive</span>
                ) : (
                  <span className="badge badge-success">Non-Aggressive</span>
                )}
              </span>
            </div>
            {selectedNPC.aggro_level && (
              <div className="detail-item">
                <span className="detail-label">Aggro Level:</span>
                <span className="detail-value">{selectedNPC.aggro_level}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Visibility:</span>
              <span className="detail-value">{getVisibilityStatus()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Position:</span>
              <span className="detail-value">{selectedNPC.position || 'standing'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Condition:</span>
              <span className="detail-value">{getConditionFromHP(selectedNPC.hp_max)}</span>
            </div>
          </div>
        </section>

        {/* Data Collection */}
        <section className="detail-section">
          <h3>Data Collection</h3>
          <div className="detail-grid">
            <div className="detail-item full-width">
              <span className="detail-label">Methods Used:</span>
              <span className="detail-value">{getDataCollectionMethods()}</span>
            </div>
          </div>
        </section>

        {/* Equipment */}
        {equipmentDetails.length > 0 && (
          <section className="detail-section">
            <h3>⚔️ Equipment ({equipmentDetails.length})</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Wear Location</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {equipmentDetails.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_name}</td>
                    <td>{item.wear_location_name}</td>
                    <td>{item.quantity || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Spells */}
        {spells.length > 0 && (
          <section className="detail-section">
            <h3>✨ Spells & Skills ({spells.length})</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Mana Cost</th>
                  <th>Times Observed</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {spells.map((spell) => (
                  <tr key={spell.id}>
                    <td>{spell.spell_name}</td>
                    <td>
                      <span className={`badge badge-${
                        spell.spell_type === 'offensive' ? 'danger' :
                        spell.spell_type === 'healing' ? 'success' :
                        spell.spell_type === 'buff' ? 'info' :
                        spell.spell_type === 'debuff' ? 'warning' :
                        'secondary'
                      }`}>
                        {spell.spell_type || 'Unknown'}
                      </span>
                    </td>
                    <td>{spell.mana_cost || 'Unknown'}</td>
                    <td>{spell.observed_count || 0}</td>
                    <td>{spell.last_observed ? new Date(spell.last_observed).toLocaleString() : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Active Flags */}
        {activeFlags.length > 0 && (
          <section className="detail-section">
            <h3>🏷️ Active Flags ({activeFlags.length})</h3>
            <div className="flag-list">
              {activeFlags.map((flag) => (
                <span
                  key={flag.id}
                  className="flag-badge"
                  style={{ backgroundColor: getFlagCategoryColor(flag.category) }}
                  title={flag.description || ''}
                >
                  {flag.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Dialogue */}
        {dialogue.length > 0 && (
          <section className="detail-section">
            <h3>💬 Dialogue ({dialogue.length})</h3>
            <div className="dialogue-list">
              {dialogue.map((d) => (
                <div key={d.id} className="dialogue-item">
                  <div className="dialogue-header">
                    <span className="badge badge-info">{d.dialogue_type || 'General'}</span>
                    {d.trigger_keyword && <span className="dialogue-trigger">Trigger: {d.trigger_keyword}</span>}
                    {d.recorded_at && <span className="dialogue-date">{new Date(d.recorded_at).toLocaleDateString()}</span>}
                  </div>
                  <p className="dialogue-text">{d.dialogue_text}</p>
                  {d.context && <p className="dialogue-context"><em>Context: {d.context}</em></p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Path */}
        {path.length > 0 && (
          <section className="detail-section">
            <h3>🚶 Movement Path ({path.length} waypoints)</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Room ID</th>
                  <th>Direction</th>
                  <th>Wait Time</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {path.map((waypoint) => (
                  <tr key={waypoint.id}>
                    <td>{waypoint.sequence_order}</td>
                    <td>{waypoint.room_id}</td>
                    <td>{waypoint.direction_from_previous || 'Start'}</td>
                    <td>{waypoint.wait_time_seconds ? `${waypoint.wait_time_seconds}s` : 'N/A'}</td>
                    <td>{waypoint.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Spawn Information */}
        {spawnInfo && (
          <section className="detail-section">
            <h3>🌟 Spawn Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Spawn Room:</span>
                <span className="detail-value">{spawnInfo.room_id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Spawn Rate:</span>
                <span className="detail-value">{spawnInfo.spawn_rate_minutes ? `${spawnInfo.spawn_rate_minutes} min` : 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Max Instances:</span>
                <span className="detail-value">{spawnInfo.max_instances || 'Unlimited'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Seen:</span>
                <span className="detail-value">
                  {spawnInfo.last_observed_spawn ? new Date(spawnInfo.last_observed_spawn).toLocaleString() : 'Never'}
                </span>
              </div>
              {spawnInfo.spawn_conditions && (
                <div className="detail-item full-width">
                  <span className="detail-label">Spawn Conditions:</span>
                  <span className="detail-value">{spawnInfo.spawn_conditions}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notes */}
        {selectedNPC.notes && (
          <section className="detail-section">
            <h3>📝 Research Notes</h3>
            <div className="notes-box">
              {selectedNPC.notes}
            </div>
          </section>
        )}

        {/* Raw Text */}
        {selectedNPC.rawText && (
          <section className="detail-section">
            <h3>Raw MUD Output</h3>
            <pre className="raw-text">{selectedNPC.rawText}</pre>
          </section>
        )}
      </div>
    </div>
  );
};