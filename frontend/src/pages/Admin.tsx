import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { SearchBox } from '../components';
import RoomForm from '../components/RoomForm';
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
  renderFieldValue,
  RoomsList
} from '../admin';

function Admin() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize selectedEntity from URL parameter or default to first entity
  const getInitialEntity = () => {
    const entityParam = searchParams.get('entity');
    if (entityParam) {
      const matchingEntity = ENTITY_CONFIGS.find(config => config.endpoint === entityParam);
      if (matchingEntity) {
        return matchingEntity;
      }
    }
    return ENTITY_CONFIGS[0];
  };
  
  const [selectedEntity, setSelectedEntity] = useState<EntityConfig>(getInitialEntity());
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
  const [selectedClass, setSelectedClass] = useState<Entity | null>(null);
  const [selectedHelpEntry, setSelectedHelpEntry] = useState<Entity | null>(null);
  const [classProficiencies, setClassProficiencies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Entity | null>(null);

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

  // Initialize state from URL parameters
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0] === 'admin') {
      const entityType = pathParts[1];
      const entityId = pathParts[2] ? parseInt(pathParts[2]) : null;

      if (entityId) {
        // Load the entity data and set the appropriate state
        const loadEntityFromUrl = async () => {
          try {
            let entity;
            switch (entityType) {
              case 'rooms':
                entity = await api.get(`/rooms/${entityId}`);
                setSelectedRoom(entity);
                setSelectedEntity(ENTITY_CONFIGS.find(c => c.endpoint === 'rooms') || ENTITY_CONFIGS[0]);
                break;
              case 'zones':
                entity = await api.get(`/zones/${entityId}`);
                setSelectedZone(entity);
                setSelectedEntity(ENTITY_CONFIGS.find(c => c.endpoint === 'zones') || ENTITY_CONFIGS[0]);
                // Load zone rooms
                const rooms = await api.get(`/rooms?zone_id=${entityId}`);
                setZoneRooms(rooms);
                break;
              case 'player_actions':
                entity = await api.get(`/player_actions/${entityId}`);
                setSelectedAction(entity);
                setSelectedEntity(ENTITY_CONFIGS.find(c => c.endpoint === 'player_actions') || ENTITY_CONFIGS[0]);
                break;
              case 'npcs':
                entity = await api.get(`/npcs/${entityId}`);
                setSelectedNPC(entity);
                setSelectedEntity(ENTITY_CONFIGS.find(c => c.endpoint === 'npcs') || ENTITY_CONFIGS[0]);
                break;
              case 'items':
                entity = await api.get(`/items/${entityId}`);
                setSelectedItem(entity);
                setSelectedEntity(ENTITY_CONFIGS.find(c => c.endpoint === 'items') || ENTITY_CONFIGS[0]);
                break;
              case 'spells':
                entity = await api.get(`/spells/${entityId}`);
                setSelectedSpell(entity);
                setSelectedEntity(ENTITY_CONFIGS.find(c => c.endpoint === 'spells') || ENTITY_CONFIGS[0]);
                break;
              case 'classes':
                entity = await api.get(`/classes/${entityId}`);
                setSelectedClass(entity);
                setSelectedEntity(ENTITY_CONFIGS.find(c => c.endpoint === 'classes') || ENTITY_CONFIGS[0]);
                // Load class proficiencies
                const proficiencies = await api.get(`/class_proficiencies?class_id=${entityId}`);
                proficiencies.sort((a: any, b: any) => {
                  if (a.level_required !== b.level_required) {
                    return a.level_required - b.level_required;
                  }
                  return a.name.localeCompare(b.name);
                });
                setClassProficiencies(proficiencies);
                break;
              case 'help_entries':
                entity = await api.get(`/help_entries/${entityId}`);
                setSelectedHelpEntry(entity);
                setSelectedEntity(ENTITY_CONFIGS.find(c => c.endpoint === 'help_entries') || ENTITY_CONFIGS[0]);
                break;
            }

            // Load related data if needed
            if (['rooms', 'zones'].includes(entityType)) {
              await loadRoomRelatedData();
            }
          } catch (error) {
            console.error('Error loading entity from URL:', error);
            // Navigate back to admin if entity not found
            navigate('/admin');
          }
        };

        loadEntityFromUrl();
      }
    }
  }, [location.pathname]);

  // Update URL when selectedEntity changes (unless we're in a detail view)
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    // Only update URL params if we're at the base /admin route (not a detail view)
    if (pathParts.length === 1 && pathParts[0] === 'admin') {
      setSearchParams({ entity: selectedEntity.endpoint }, { replace: true });
    }
  }, [selectedEntity, location.pathname]);

  // Sync selectedEntity when URL params change
  useEffect(() => {
    const entityParam = searchParams.get('entity');
    if (entityParam) {
      const matchingEntity = ENTITY_CONFIGS.find(config => config.endpoint === entityParam);
      if (matchingEntity && matchingEntity.endpoint !== selectedEntity.endpoint) {
        setSelectedEntity(matchingEntity);
      }
    }
  }, [searchParams]);

  // Reset sort when changing entity types
  useEffect(() => {
    setSortField(null);
    setSortDirection('asc');
  }, [selectedEntity]);

  useEffect(() => {
    loadEntities();
  }, [selectedEntity]);

  const loadRoomRelatedData = async () => {
    const [zones, exits, connections] = await Promise.all([
      api.get('/zones'), 
      api.get('/room_exits'),
      api.get('/zone_connections')
    ]);
    setAllZones(zones);
    setRoomExits(exits);
    setZoneConnections(connections);
  };

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

      // If loading rooms, also load zones and exits for room lookup
      if (selectedEntity.endpoint === 'rooms') {
        await loadRoomRelatedData();
        setAllRooms(data);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (selectedEntity.endpoint === 'rooms') {
      // Use RoomForm for room creation
      setEditingRoom(null);
      setShowRoomForm(true);
    } else {
      // Use generic form for other entities
      setEditingEntity(null);
      setFormData({});
      setShowForm(true);
    }
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
    navigate(`/admin/zones/${zone.id}`);
  };

  const handleBackToZones = () => {
    navigate('/admin');
  };

  const handleAddRoomToZone = () => {
    if (!selectedZone) return;

    // Use RoomForm for room creation with pre-selected zone
    setFormData({
      zone_id: selectedZone.id,
      name: '',
      description: '',
      area: '',
      flags: '',
      terrain: '',
      portal_key: '',
      greater_binding_key: '',
      coordinates: { x: 0, y: 0 },
      exits: [],
      npcs: [],
      items: []
    });
    setEditingRoom(null);
    setShowRoomForm(true);
  };

  const handleRoomClick = async (room: Entity) => {
    navigate(`/admin/rooms/${room.id}`);
  };

  const handleBackToRooms = () => {
    if (selectedZone) {
      navigate(`/admin/zones/${selectedZone.id}`);
    } else if (selectedRoom?.zone_id) {
      navigate(`/admin/zones/${selectedRoom.zone_id}`);
    } else {
      navigate('/admin');
    }
  };

  const handleActionClick = (action: Entity) => {
    navigate(`/admin/player_actions/${action.id}`);
  };

  const handleBackToActions = () => {
    navigate('/admin');
  };

  const handleNPCClick = (npc: Entity) => {
    navigate(`/admin/npcs/${npc.id}`);
  };

  const handleBackToNPCs = () => {
    navigate('/admin');
  };

  const handleItemClick = (item: Entity) => {
    navigate(`/admin/items/${item.id}`);
  };

  const handleBackToItems = () => {
    navigate('/admin');
  };

  const handleSpellClick = (spell: Entity) => {
    navigate(`/admin/spells/${spell.id}`);
  };

  const handleBackToSpells = () => {
    navigate('/admin');
  };

  const handleClassClick = async (classEntity: Entity) => {
    navigate(`/admin/classes/${classEntity.id}`);
  };

  const handleBackToClasses = () => {
    navigate('/admin');
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
    navigate(`/admin/help_entries/${helpEntry.id}`);
  };

  const handleBackToHelpEntries = () => {
    navigate('/admin');
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

  const handleSaveRoom = async (roomData: any) => {
    try {
      if (editingRoom) {
        // Update existing room
        await api.put(`/rooms/${editingRoom.id}`, roomData);
      } else {
        // Create new room
        await api.post('/rooms', roomData);
      }
      setShowRoomForm(false);
      loadEntities(); // Refresh the rooms list
      // Also refresh room exits since they may have been updated
      await loadRoomRelatedData();
    } catch (error) {
      console.error('Failed to save room:', error);
      alert('Failed to save room. Please try again.');
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
          backButtonText={
            selectedZone 
              ? `← Back to ${selectedZone.name}` 
              : (selectedRoom?.zone_id 
                  ? `← Back to ${allZones.find(z => z.id === selectedRoom.zone_id)?.name || 'Zone'}` 
                  : '← Back to Admin'
                )
          }
          setSelectedRoom={setSelectedRoom}
          onRoomExitsChange={loadRoomRelatedData}
          zoneConnections={zoneConnections}
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
          handleBackToZones={handleBackToZones}
          handleRoomClick={handleRoomClick}
          onAddRoom={handleAddRoomToZone}
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
                onClick={() => {
                  // Update URL parameter instead of directly setting state
                  setSearchParams({ entity: config.endpoint }, { replace: true });
                }}
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

            {/* Search Box - show for player_actions and help_entries */}
            {(selectedEntity.endpoint === 'player_actions' || selectedEntity.endpoint === 'help_entries') && (
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
            ) : selectedEntity.endpoint === 'rooms' ? (
              <RoomsList
                rooms={filteredEntities}
                handleRoomClick={handleRoomClick}
                emptyMessage={`No rooms found. Click "Create New" to add one.`}
                allZones={allZones}
                ENTITY_CONFIGS={ENTITY_CONFIGS}
                setSelectedEntity={setSelectedEntity}
                handleZoneClick={handleZoneClick}
                handleDelete={handleDelete}
              />
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

      {showRoomForm && (
        <RoomForm
          room={editingRoom as any}
          onSave={handleSaveRoom}
          onCancel={() => setShowRoomForm(false)}
        />
      )}
    </div>
  );
}

export default Admin;
