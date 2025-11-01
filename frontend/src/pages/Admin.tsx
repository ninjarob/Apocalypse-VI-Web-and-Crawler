import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { SearchBox } from '../components';
import {
  ENTITY_CONFIGS,
  Entity,
  EntityConfig,
  ActionDetailView,
  RoomDetailView,
  NPCDetailView,
  ItemDetailView,
  SpellDetailView,
  ClassDetailView,
  ZoneDetailView,
  HelpEntryDetailView,
  EditFormModal,
  AbilityScoresModal,
  renderFieldValue
} from '../admin';

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
  const [roomBackContext, setRoomBackContext] = useState<'rooms' | 'zone'>('rooms');
  const [selectedAction, setSelectedAction] = useState<Entity | null>(null);
  const [selectedNPC, setSelectedNPC] = useState<Entity | null>(null);
  const [selectedItem, setSelectedItem] = useState<Entity | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<Entity | null>(null);
  const [selectedClass, setSelectedClass] = useState<Entity | null>(null);
  const [selectedHelpEntry, setSelectedHelpEntry] = useState<Entity | null>(null);
  const [classProficiencies, setClassProficiencies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Reset all drilled-in states when navigating to /admin
  useEffect(() => {
    setSelectedZone(null);
    setSelectedRoom(null);
    setSelectedAction(null);
    setSelectedAbility(null);
    setSelectedNPC(null);
    setSelectedItem(null);
    setSelectedSpell(null);
    setSelectedClass(null);
    setSelectedHelpEntry(null);
    setShowScores(false);
    setShowForm(false);
    setEditingEntity(null);
    setSearchTerm(''); // Reset search when navigating
    setSortField(null); // Reset sort when navigating
    setSortDirection('asc');
  }, [location.pathname]);

  // Reset sort when changing entity types
  useEffect(() => {
    setSortField(null);
    setSortDirection('asc');
  }, [selectedEntity]);

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
      await api.delete(selectedEntity.endpoint, id);
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
    // Set context based on whether we're viewing a zone
    if (selectedZone) {
      setRoomBackContext('zone');
    } else {
      setRoomBackContext('rooms');
    }
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
    // Don't reset context here - let it persist for next room click
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

  const handleClassClick = async (classEntity: Entity) => {
    setSelectedClass(classEntity);
    try {
      const proficiencies = await api.get(`/class_proficiencies?class_id=${classEntity.id}`);
      // Sort by level_required, then by name
      proficiencies.sort((a: any, b: any) => {
        if (a.level_required !== b.level_required) {
          return a.level_required - b.level_required;
        }
        return a.name.localeCompare(b.name);
      });
      setClassProficiencies(proficiencies);
    } catch (error) {
      console.error('Error loading class proficiencies:', error);
      setClassProficiencies([]);
    }
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setClassProficiencies([]);
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
    } else if (selectedEntity.endpoint === 'classes') {
      handleClassClick(entity);
    } else if (selectedEntity.endpoint === 'help_entries') {
      handleHelpEntryClick(entity);
    }
  };

  const handleHelpEntryClick = (helpEntry: Entity) => {
    setSelectedHelpEntry(helpEntry);
  };

  const handleBackToHelpEntries = () => {
    setSelectedHelpEntry(null);
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

  // Handle column sorting
  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(fieldName);
      setSortDirection('asc');
    }
  };

  // Filter and sort entities
  const getFilteredAndSortedEntities = () => {
    let filtered = entities;

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = entities.filter(entity => {
        return selectedEntity.fields
          .filter(field => !field.hideInTable)
          .some(field => {
            const value = entity[field.name];
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.toLowerCase().includes(lowerSearchTerm);
            if (Array.isArray(value)) return value.some(v => String(v).toLowerCase().includes(lowerSearchTerm));
            return String(value).toLowerCase().includes(lowerSearchTerm);
          });
      });
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

        // Handle different types
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // String comparison (case-insensitive)
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const filteredEntities = getFilteredAndSortedEntities();

  return (
    <div className="page admin-page">
      <h2>Admin Panel</h2>

      {/* Detail Views */}
      {selectedRoom && (
        <RoomDetailView
          selectedRoom={selectedRoom}
          handleBackToRooms={handleBackToRooms}
          allZones={allZones}
          roomExits={roomExits}
          allRooms={allRooms}
          setAllRooms={setAllRooms}
          handleRoomClick={handleRoomClick}
          ENTITY_CONFIGS={ENTITY_CONFIGS}
          setSelectedEntity={setSelectedEntity}
          handleZoneClick={handleZoneClick}
          backButtonText={roomBackContext === 'zone' ? `← Back to ${selectedZone?.name || 'Zone'}` : '← Back to Rooms'}
        />
      )}

      {selectedAction && (
        <ActionDetailView
          selectedAction={selectedAction}
          handleBackToActions={handleBackToActions}
        />
      )}

      {selectedNPC && (
        <NPCDetailView
          selectedNPC={selectedNPC}
          handleBackToNPCs={handleBackToNPCs}
        />
      )}

      {selectedItem && (
        <ItemDetailView
          selectedItem={selectedItem}
          handleBackToItems={handleBackToItems}
        />
      )}

      {selectedSpell && (
        <SpellDetailView
          selectedSpell={selectedSpell}
          handleBackToSpells={handleBackToSpells}
        />
      )}

      {selectedClass && (
        <ClassDetailView
          selectedClass={selectedClass}
          classProficiencies={classProficiencies}
          handleBackToClasses={handleBackToClasses}
        />
      )}

      {selectedZone && (
        <ZoneDetailView
          selectedZone={selectedZone}
          zoneRooms={zoneRooms}
          roomExits={roomExits}
          handleBackToZones={handleBackToZones}
          handleRoomClick={handleRoomClick}
        />
      )}

      {selectedHelpEntry && (
        <HelpEntryDetailView
          selectedHelpEntry={selectedHelpEntry}
          handleBackToHelpEntries={handleBackToHelpEntries}
        />
      )}

      {/* Main Admin Interface */}
      {!selectedRoom && !selectedAction && !selectedNPC && !selectedItem && !selectedSpell && !selectedClass && !selectedZone && !selectedHelpEntry && (
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

            {/* Search Box - only show for player_actions for now */}
            {selectedEntity.endpoint === 'player_actions' && (
              <div className="search-container" style={{ marginBottom: '1rem' }}>
                <SearchBox
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={`Search ${selectedEntity.name.toLowerCase()}...`}
                />
              </div>
            )}

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
                          <th 
                            key={field.name} 
                            onClick={() => handleSort(field.name)}
                            className="sortable-header"
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            {field.label}
                            {sortField === field.name && (
                              <span className="sort-indicator">
                                {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                              </span>
                            )}
                          </th>
                        ))}
                      {!selectedEntity.readOnly && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntities.length === 0 ? (
                      <tr>
                        <td
                          colSpan={
                            selectedEntity.fields.filter(f => !f.hideInTable).length +
                            (!selectedEntity.readOnly ? 1 : 0)
                          }
                          className="empty-cell"
                        >
                          {entities.length === 0
                            ? `No ${selectedEntity.name.toLowerCase()} found. Click "Create New" to add one.`
                            : `No ${selectedEntity.name.toLowerCase()} found matching your search.`
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredEntities.map(entity => (
                        <tr
                          key={entity.id}
                          className={selectedEntity.clickable ? 'clickable-row' : ''}
                          onClick={() => selectedEntity.clickable && handleEntityClick(entity)}
                        >
                          {selectedEntity.fields
                            .filter(f => !f.hideInTable)
                            .map(field => (
                              <td key={field.name} data-field={field.name}>
                                {renderFieldValue(entity, field, allZones, entities, roomExits, zoneAreas, zoneConnections, setSelectedEntity, handleZoneClick)}
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

      {/* Modals */}
      <EditFormModal
        showForm={showForm}
        setShowForm={setShowForm}
        editingEntity={editingEntity}
        formData={formData}
        selectedEntity={selectedEntity}
        handleSubmit={handleSubmit}
        handleFieldChange={handleFieldChange}
      />

      <AbilityScoresModal
        showScores={showScores}
        setShowScores={setShowScores}
        selectedAbility={selectedAbility}
        abilityScores={abilityScores}
      />
    </div>
  );
}

export default Admin;
