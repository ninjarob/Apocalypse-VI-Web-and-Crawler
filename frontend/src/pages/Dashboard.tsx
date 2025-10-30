import { useState, useEffect } from 'react';
import { api, Stats } from '../api';
import { Loading } from '../components';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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
      <h2>MUD Map</h2>

      {/* Map Placeholder */}
      <div
        style={{
          border: '2px dashed #444',
          borderRadius: '8px',
          padding: '60px 20px',
          textAlign: 'center',
          backgroundColor: '#1a1a1a',
          marginTop: '20px',
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>🗺️</div>
        <h3 style={{ color: '#888', marginBottom: '10px' }}>Interactive MUD Map</h3>
        <p style={{ color: '#666', maxWidth: '600px', lineHeight: '1.6' }}>
          This space will display an interactive visualization of the MUD world, showing rooms,
          connections, zones, and navigation paths discovered by the crawler.
        </p>

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

        <p style={{ color: '#555', marginTop: '30px', fontSize: '14px' }}>
          Use the Admin panel to browse and manage all discovered data.
        </p>
      </div>
    </div>
  );
}
