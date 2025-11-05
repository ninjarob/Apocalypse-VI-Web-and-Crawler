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

interface GraphNode extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  roomData: Room;
}

interface ZoneMapProps {
  onRoomClick?: (room: Room) => void;
}

export const ZoneMap: React.FC<ZoneMapProps> = ({ onRoomClick }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [exits, setExits] = useState<RoomExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load zones on component mount
  useEffect(() => {
    const loadZones = async () => {
      try {
        const zonesData = await api.getAll('zones') as Zone[];
        setZones(zonesData);
        // Auto-select first zone if available
        if (zonesData.length > 0) {
          setSelectedZoneId(zonesData[0].id);
        }
      } catch (error) {
        console.error('Failed to load zones:', error);
      }
    };
    loadZones();
  }, []);

  // Load rooms and exits when zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      return;
    }

    const loadZoneData = async () => {
      setLoading(true);
      try {
        // Load rooms for selected zone
        const roomsData = await api.getAll('rooms') as Room[];
        const zoneRooms = roomsData.filter((room: Room) => room.zone_id === selectedZoneId);
        setRooms(zoneRooms);

        // Load exits for these rooms
        const exitsData = await api.getAll('room_exits') as RoomExit[];
        const roomIds = zoneRooms.map((r: Room) => r.id);
        const zoneExits = exitsData.filter((exit: RoomExit) =>
          roomIds.includes(exit.from_room_id) && (!exit.to_room_id || roomIds.includes(exit.to_room_id))
        );
        setExits(zoneExits);

      } catch (error) {
        console.error('Failed to load zone data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadZoneData();
  }, [selectedZoneId]);

  // Force-directed layout effect
  useEffect(() => {
    if (!svgRef.current || rooms.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = 800;
    const height = 600;

    // Create nodes and links data
    const nodes: GraphNode[] = rooms.map(room => ({
      id: room.id,
      name: room.name,
      roomData: room
    }));

    const links = exits
      .filter(exit => exit.to_room_id && 
        rooms.find(r => r.id === exit.from_room_id) &&
        rooms.find(r => r.id === exit.to_room_id))
      .map(exit => ({
        source: exit.from_room_id,
        target: exit.to_room_id!,
        direction: exit.direction
      }));

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Create arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#666');

    // Create links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#666')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) {
            simulation.alphaTarget(0.3).restart();
          }
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) {
            simulation.alphaTarget(0);
          }
          d.fx = null;
          d.fy = null;
        }));

    // Add rectangles to nodes
    node.append('rect')
      .attr('width', 100)
      .attr('height', 60)
      .attr('fill', '#2a2a2a')
      .attr('stroke', '#4fc3f7')
      .attr('stroke-width', 2)
      .attr('rx', 8)
      .attr('x', -50)
      .attr('y', -30);

    // Add text to nodes
    node.append('text')
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none')
      .call(wrapText, 90);

    // Add click handlers
    node.on('click', (_event, d) => {
      if (onRoomClick) {
        onRoomClick(d.roomData);
      } else {
        setSelectedRoom(d.roomData);
      }
    });

    // Add hover effects
    node.on('mouseover', function() {
      d3.select(this).select('rect')
        .attr('fill', '#3a3a3a')
        .attr('stroke', '#81c784');
    });

    node.on('mouseout', function() {
      d3.select(this).select('rect')
        .attr('fill', '#2a2a2a')
        .attr('stroke', '#4fc3f7');
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Text wrapping function
    function wrapText(text: d3.Selection<SVGTextElement, GraphNode, SVGGElement, unknown>, width: number) {
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

    return () => {
      simulation.stop();
    };
  }, [rooms, exits, onRoomClick]);

  const currentRooms = rooms;

  if (loading && zones.length === 0) {
    return <Loading />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px', border: '1px solid #444', borderRadius: '8px', backgroundColor: '#1a1a1a' }}>

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
            width="100%"
            height="600"
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
          onClick={() => setSelectedRoom(null)}
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
            </div>

            {/* Exits for this room */}
            {exits.filter(exit => exit.from_room_id === selectedRoom.id).length > 0 && (
              <div>
                <strong>Exits:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {exits
                    .filter(exit => exit.from_room_id === selectedRoom.id)
                    .map(exit => (
                      <li key={exit.id} style={{ color: '#ccc' }}>
                        {exit.direction}
                        {exit.description && ` - ${exit.description}`}
                        {exit.to_room_id && rooms.find(r => r.id === exit.to_room_id) && (
                          <span style={{ color: '#4fc3f7' }}>
                            {' '}→ {rooms.find(r => r.id === exit.to_room_id)?.name}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};