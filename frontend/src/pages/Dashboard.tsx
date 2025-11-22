import { useState, useEffect } from 'react';
import { api, Stats } from '../api';
import { Loading, ZoneMap } from '../components';

interface Zone {
  id: number;
  name: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const statsData = await api.getStats();
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <h2>MUD Map{currentZone ? ` - ${currentZone.name}` : ''}</h2>

      {/* Interactive MUD Map */}
      <ZoneMap onZoneChange={setCurrentZone} />

      {/* Quick Stats */}
      {stats && (
        <div
          style={{
            marginTop: '40px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '15px',
            width: '100%',
            maxWidth: '600px'
          }}
        >
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>ROOMS</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4fc3f7' }}>
              {stats.rooms}
            </div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>NPCs</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#81c784' }}>
              {stats.npcs}
            </div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>ITEMS</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffb74d' }}>
              {stats.items}
            </div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>SPELLS</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ba68c8' }}>
              {stats.spells}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
