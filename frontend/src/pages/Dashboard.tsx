import { useState, useEffect } from 'react';
import { api, Stats, CrawlerStatus } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<CrawlerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [statsData, statusData] = await Promise.all([api.getStats(), api.getCrawlerStatus()]);
      setStats(statsData);
      setStatus(statusData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <h2>Dashboard</h2>

      {status && (
        <div className={`crawler-status ${status.status !== 'idle' ? 'active' : ''}`}>
          <h3>Crawler Status</h3>
          <p>
            <strong>Status:</strong> {status.status}
          </p>
          <p>
            <strong>Last Update:</strong> {new Date(status.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Rooms Discovered</h3>
            <div className="value">{stats.rooms}</div>
          </div>
          <div className="stat-card">
            <h3>NPCs Found</h3>
            <div className="value">{stats.npcs}</div>
          </div>
          <div className="stat-card">
            <h3>Items Cataloged</h3>
            <div className="value">{stats.items}</div>
          </div>
          <div className="stat-card">
            <h3>Spells Documented</h3>
            <div className="value">{stats.spells}</div>
          </div>
          <div className="stat-card">
            <h3>Attacks Recorded</h3>
            <div className="value">{stats.attacks}</div>
          </div>
          <div className="stat-card">
            <h3>Total Entities</h3>
            <div className="value">{stats.total}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px' }}>
        <h3>Recent Activity</h3>
        <p style={{ color: '#888' }}>
          The crawler is systematically exploring the Apocalypse VI MUD and documenting everything
          it finds. Use the navigation menu to browse discovered rooms, NPCs, items, and more.
        </p>
      </div>
    </div>
  );
}
