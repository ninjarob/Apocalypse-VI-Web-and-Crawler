import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { api } from '../api';
import { Loading } from './Loading';

interface Room {
  id: number;
  name: string;
  zone_id?: number;
  description?: string;
  terrain?: string;
  flags?: string;
  zone_exit?: boolean;
  portal_key?: string;
  x?: number;
  y?: number;
}

interface RoomExit {
  id: number;
  from_room_id: number;
  to_room_id?: number;
  direction: string;
  description?: string;
}

interface Zone {
  id: number;
  name: string;
}

interface MapNode {
  id: number;
  name: string;
  roomData: Room;
  x: number;
  y: number;
}

interface ZoneMapProps {
  onRoomClick?: (room: Room) => void;
  onZoneChange?: (zone: Zone | null) => void;
  initialZoneId?: number;
}

export const ZoneMap: React.FC<ZoneMapProps> = ({ onRoomClick, onZoneChange, initialZoneId }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [exits, setExits] = useState<RoomExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 4000, height: 2500 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Load zones on component mount
  useEffect(() => {
    const loadZones = async () => {
      try {
        const zonesData = await api.getAll('zones') as Zone[];
        setZones(zonesData);
        // Use initialZoneId from URL if provided, otherwise auto-select first zone
        if (initialZoneId && zonesData.some(z => z.id === initialZoneId)) {
          setSelectedZoneId(initialZoneId);
        } else if (zonesData.length > 0) {
          setSelectedZoneId(zonesData[0].id);
        }
      } catch (error) {
        console.error('Failed to load zones:', error);
      }
    };
    loadZones();
  }, [initialZoneId]);

  // Load rooms and exits when zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      return;
    }

    const loadZoneData = async () => {
      setLoading(true);
      try {
        // Load rooms for selected zone
        const zoneRooms = await api.getAll('rooms', { zone_id: selectedZoneId }) as Room[];
        setRooms(zoneRooms);

        // Load exits for rooms in this zone
        const zoneExits = await api.getAll('room_exits', { zone_id: selectedZoneId }) as RoomExit[];
        setExits(zoneExits);

      } catch (error) {
        console.error('Failed to load zone data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadZoneData();
  }, [selectedZoneId]);

  // Notify parent component when zone changes
  useEffect(() => {
    if (onZoneChange && selectedZoneId !== null) {
      const currentZone = zones.find(zone => zone.id === selectedZoneId) || null;
      onZoneChange(currentZone);
    }
  }, [selectedZoneId, zones, onZoneChange]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedRoom) {
        setSelectedRoom(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRoom]);

  // Coordinate-based layout effect
  useEffect(() => {
    if (!svgRef.current || rooms.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Check if rooms have coordinates
    const hasCoordinates = rooms.some(room => room.x !== undefined && room.y !== undefined);
    console.log('🔍 ZoneMap: Checking coordinates for', rooms.length, 'rooms');
    console.log('🔍 First few rooms:', rooms.slice(0, 3).map(r => ({ id: r.id, name: r.name, x: r.x, y: r.y })));
    console.log('🔍 hasCoordinates:', hasCoordinates);

    let nodes: MapNode[];
    let links: any[];

    if (hasCoordinates) {
      // Use coordinate-based positioning
      console.log('📍 Using coordinate-based layout');

      // Calculate coordinate bounds
      const coords = rooms.filter(r => r.x !== undefined && r.y !== undefined);
      console.log('📍 Rooms with coordinates:', coords.length);
      if (coords.length === 0) {
        console.warn('No rooms with coordinates found');
        return;
      }

      const xCoords = coords.map(r => r.x!);
      const yCoords = coords.map(r => r.y!);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);

      const coordWidth = maxX - minX || 1;
      const coordHeight = maxY - minY || 1;

      // Calculate SVG size with optimized padding
      const topPadding = 50;     // Small top padding to reduce empty space above northern rooms
      const bottomPadding = 50;  // Small bottom padding
      const sidePadding = 120;   // Slightly larger side padding for better horizontal spacing
      
      // Apply slight horizontal scaling (1.2x) to reduce squishing while maintaining readability
      const horizontalScale = 1.2;
      const scaledCoordWidth = coordWidth * horizontalScale;
      
      // Calculate offsets to place northernmost room close to top, southernmost close to bottom
      const offsetX = sidePadding - minX;
      const offsetY = topPadding - minY;
      
      // SVG dimensions based on scaled coordinates + padding
      const svgWidth = scaledCoordWidth + (2 * sidePadding);
      const svgHeight = coordHeight + topPadding + bottomPadding;

      // Update SVG dimensions state
      setSvgDimensions({ width: svgWidth, height: svgHeight });

      nodes = rooms.map(room => ({
        id: room.id,
        name: room.name,
        roomData: room,
        x: room.x !== undefined ? (room.x + offsetX) * horizontalScale : svgWidth / 2,
        y: room.y !== undefined ? room.y + offsetY : svgHeight / 2
      }));

      // Update SVG dimensions
      svg.attr('width', svgWidth).attr('height', svgHeight);
    } else {
      // Fall back to force-directed layout
      console.log('🔗 Using force-directed layout (no coordinates available)');
      console.log('🔗 Rooms without coordinates:', rooms.filter(r => r.x === undefined || r.y === undefined).length);

      // Set default dimensions for force-directed layout
      const defaultWidth = 1200;
      const defaultHeight = 800;
      setSvgDimensions({ width: defaultWidth, height: defaultHeight });
      svg.attr('width', defaultWidth).attr('height', defaultHeight);

      // Create basic nodes
      const basicNodes = rooms.map(room => ({
        id: room.id,
        name: room.name,
        roomData: room
      }));

      // Create force simulation as fallback
      const simulation = d3.forceSimulation(basicNodes as d3.SimulationNodeDatum[])
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(defaultWidth / 2, defaultHeight / 2))
        .force('collision', d3.forceCollide().radius(50));  // Reduced from 60 to match smaller nodes

      // Let simulation run briefly
      simulation.tick(100);
      simulation.stop();

      // Convert to MapNode format
      nodes = (basicNodes as any[]).map(node => ({
        id: node.id,
        name: node.name,
        roomData: node.roomData,
        x: node.x || defaultWidth / 2,
        y: node.y || defaultHeight / 2
      }));
    }

    // Create links
    links = exits
      .filter(exit => exit.to_room_id &&
        rooms.find(r => r.id === exit.from_room_id) &&
        rooms.find(r => r.id === exit.to_room_id))
      .map(exit => ({
        source: nodes.find(n => n.id === exit.from_room_id),
        target: nodes.find(n => n.id === exit.to_room_id),
        direction: exit.direction
      }))
      .filter(link => link.source && link.target);

    // Create arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)  // Adjusted for smaller node (was 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#666');

    // Direction vectors for extending zone exit lines
    const directionVectors: { [key: string]: { dx: number, dy: number } } = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 },
      northeast: { dx: 1, dy: -1 },
      northwest: { dx: -1, dy: -1 },
      southeast: { dx: 1, dy: 1 },
      southwest: { dx: -1, dy: 1 },
      up: { dx: 0, dy: -1 },
      down: { dx: 0, dy: 1 }
    };

    // Create links
    svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#666')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    // Create zone exit extension lines
    const extensionLength = 50; // pixels
    const zoneExitExtensions = exits
      .filter(exit => {
        const fromRoom = rooms.find(r => r.id === exit.from_room_id);
        return fromRoom && fromRoom.zone_exit && !rooms.find(r => r.id === exit.to_room_id);
      })
      .map(exit => {
        const fromNode = nodes.find(n => n.id === exit.from_room_id);
        if (!fromNode) return null;
        const vector = directionVectors[exit.direction.toLowerCase()];
        if (!vector) return null;
        // Normalize and scale
        const length = Math.sqrt(vector.dx * vector.dx + vector.dy * vector.dy);
        const dx = (vector.dx / length) * extensionLength;
        const dy = (vector.dy / length) * extensionLength;
        return {
          x1: fromNode.x,
          y1: fromNode.y,
          x2: fromNode.x + dx,
          y2: fromNode.y + dy,
          to_room_id: exit.to_room_id,
          direction: exit.direction
        };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; to_room_id: number; direction: string }[];

    svg.append('g')
      .attr('class', 'zone-exit-extensions')
      .selectAll('line')
      .data(zoneExitExtensions)
      .enter().append('line')
      .attr('stroke', '#4caf50') // green
      .attr('stroke-width', 6)
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2)
      .attr('cursor', 'pointer')
      .on('click', async (_event, d) => {
        try {
          const targetRooms = await api.getAll('rooms', { id: d.to_room_id }) as Room[];
          if (targetRooms.length > 0) {
            const targetZoneId = targetRooms[0].zone_id;
            if (targetZoneId !== undefined) {
              setSelectedZoneId(targetZoneId);
            }
          }
        } catch (error) {
          console.error('Failed to get target room zone:', error);
        }
      });

    // Create nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    // Add rectangles to nodes
    node.append('rect')
      .attr('width', 60)  // Further reduced from 80
      .attr('height', 40)  // Further reduced from 50
      .attr('fill', '#2a2a2a')
      .attr('stroke', (d: any) => d.roomData.zone_exit ? '#4caf50' : '#4fc3f7')
      .attr('stroke-width', 2)
      .attr('rx', 8)
      .attr('x', -30)  // Adjusted for new width (60/2)
      .attr('y', -20);  // Adjusted for new height (40/2)

    // Add clipping path for text overflow
    node.append('clipPath')
      .attr('id', (d: any) => `clip-${d.id}`)
      .append('rect')
      .attr('width', 56)  // Slightly smaller than node for padding
      .attr('height', 36)
      .attr('x', -28)
      .attr('y', -18);

    // Add text to nodes
    node.append('text')
      .attr('clip-path', (d: any) => `url(#clip-${d.id})`)  // Apply clipping
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '10px')  // Reduced from 12px
      .attr('pointer-events', 'none')
      .call(wrapText, 55);  // Adjusted for smaller width (60px node)

    // Add click handlers
    node.on('click', (_event, d) => {
      if (onRoomClick) {
        onRoomClick(d.roomData);
      } else {
        setSelectedRoom(d.roomData);
      }
    });

    // Add hover effects
    node.on('mouseover', function(_event, d) {
      d3.select(this).select('rect')
        .attr('fill', '#3a3a3a')
        .attr('stroke', d.roomData.zone_exit ? '#66bb6a' : '#81c784');
    });

    node.on('mouseout', function(_event, d) {
      d3.select(this).select('rect')
        .attr('fill', '#2a2a2a')
        .attr('stroke', d.roomData.zone_exit ? '#4caf50' : '#4fc3f7');
    });

    // Text wrapping function
    function wrapText(text: d3.Selection<SVGTextElement, MapNode, SVGGElement, unknown>, width: number) {
      text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word: string | undefined;
        const line: string[] = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = text.attr('y');
        const dy = parseFloat(text.attr('dy') || '0');
        let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');

        while ((word = words.pop()) !== undefined) {
          line.push(word);
          tspan.text(line.join(' '));
          if ((tspan.node() as SVGTextElement).getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(' '));
            line.length = 0;
            line.push(word);
            tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
          }
        }
      });
    }

  }, [rooms, exits, onRoomClick]);  const currentRooms = rooms;

  if (loading && zones.length === 0) {
    return <Loading />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: `${Math.min(svgDimensions.height + 100, 800)}px`, border: '1px solid #444', borderRadius: '8px', backgroundColor: '#1a1a1a' }}>

      {/* Zone Selection Dropdown - Upper Right */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10
      }}>
        <select
          value={selectedZoneId || ''}
          onChange={(e) => setSelectedZoneId(Number(e.target.value))}
          style={{
            backgroundColor: '#2a2a2a',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          {zones.map(zone => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>

      {/* Z-Level Selector - Upper Left */}
      {/* Removed - coordinates are arbitrary labels */}

      {/* Map Content */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: '60px 20px 20px 20px' // Space for controls
      }}>

        {loading ? (
          <Loading />
        ) : currentRooms.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#666'
          }}>
            No rooms found in this zone
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={svgDimensions.width}
            height={svgDimensions.height}
            style={{ border: '1px solid #444', backgroundColor: '#1a1a1a' }}
          />
        )}
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto',
              color: '#fff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#4fc3f7' }}>{selectedRoom.name}</h3>
              <button
                onClick={() => setSelectedRoom(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0'
                }}
              >
                ×
              </button>
            </div>

            {selectedRoom.description && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Description:</strong>
                <p style={{ margin: '5px 0', color: '#ccc' }}>{selectedRoom.description}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              {selectedRoom.terrain && (
                <div>
                  <strong>Terrain:</strong> {selectedRoom.terrain}
                </div>
              )}
              {selectedRoom.flags && (
                <div>
                  <strong>Flags:</strong> {selectedRoom.flags}
                </div>
              )}
              {selectedRoom.zone_exit && (
                <div>
                  <strong>Zone Exit:</strong> Yes
                </div>
              )}
              {(selectedRoom as any).portal_key && (
                <div>
                  <strong>Portal Key:</strong> <span style={{ fontFamily: 'monospace', color: '#4fc3f7' }}>{(selectedRoom as any).portal_key}</span>
                </div>
              )}
            </div>

            {/* Exits for this room */}
            {exits.filter(exit => exit.from_room_id === selectedRoom.id).length > 0 && (
              <div>
                <strong>Exits:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {exits
                    .filter(exit => exit.from_room_id === selectedRoom.id)
                    .map(exit => {
                      const destinationRoom = exit.to_room_id ? rooms.find(r => r.id === exit.to_room_id) : null;
                      return (
                        <li key={exit.id} style={{ color: '#ccc' }}>
                          {exit.direction}
                          {exit.description && ` - ${exit.description}`}
                          {destinationRoom && (
                            <span style={{ color: '#4fc3f7' }}>
                              {' '}→ {destinationRoom.name}
                              {destinationRoom.portal_key && (
                                <span style={{ fontFamily: 'monospace', color: '#81c784' }}>
                                  {' ('}{destinationRoom.portal_key}{')'}
                                </span>
                              )}
                            </span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};