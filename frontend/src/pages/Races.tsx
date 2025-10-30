import { useEffect, useState } from 'react';
import { api } from '../api';

interface Race {
  id: string;
  name: string;
  description?: string;
  stats?: Record<string, any>;
  abilities?: string[];
  requirements?: string[];
  helpText?: string;
  discovered?: string;
}

function Races() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  useEffect(() => {
    fetchRaces();
    const interval = setInterval(fetchRaces, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRaces = async () => {
    try {
      const data = await api.get('/races');
      setRaces(data);
    } catch (error) {
      console.error('Error fetching races:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatStats = (stats?: Record<string, any>) => {
    if (!stats) return 'None';
    return Object.entries(stats).map(([key, value]) => {
      const sign = value > 0 ? '+' : '';
      return `${key}: ${sign}${value}`;
    }).join(', ');
  };

  if (loading) {
    return <div className="page">Loading races...</div>;
  }

  return (
    <div className="page">
      <h2>Races ({races.length})</h2>
      
      <div className="grid">
        <div className="list-section">
          <div className="entity-list">
            {races.map(race => (
              <div 
                key={race.id} 
                className={`entity-card ${selectedRace?.id === race.id ? 'selected' : ''}`}
                onClick={() => setSelectedRace(race)}
              >
                <h3>{race.name}</h3>
                {race.description && (
                  <p className="description">{race.description.substring(0, 100)}{race.description.length > 100 ? '...' : ''}</p>
                )}
                {race.stats && (
                  <div className="meta">
                    <span className="tag">Stats: {formatStats(race.stats)}</span>
                  </div>
                )}
                {race.abilities && race.abilities.length > 0 && (
                  <div className="meta">
                    <span className="tag">{race.abilities.length} abilities</span>
                  </div>
                )}
              </div>
            ))}
            
            {races.length === 0 && (
              <div className="empty-state">
                <p>No races discovered yet.</p>
                <p className="hint">Run the race discovery crawler to populate this list.</p>
              </div>
            )}
          </div>
        </div>

        {selectedRace && (
          <div className="detail-section">
            <div className="detail-panel">
              <h2>{selectedRace.name}</h2>
              
              {selectedRace.description && (
                <section>
                  <h3>Description</h3>
                  <p>{selectedRace.description}</p>
                </section>
              )}

              {selectedRace.stats && Object.keys(selectedRace.stats).length > 0 && (
                <section>
                  <h3>Stat Modifiers</h3>
                  <div className="stats-grid">
                    {Object.entries(selectedRace.stats).map(([stat, value]) => (
                      <div key={stat} className="stat-item">
                        <span className="stat-name">{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                        <span className={`stat-value ${value > 0 ? 'positive' : value < 0 ? 'negative' : ''}`}>
                          {value > 0 ? '+' : ''}{value}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedRace.abilities && selectedRace.abilities.length > 0 && (
                <section>
                  <h3>Racial Abilities</h3>
                  <ul className="ability-list">
                    {selectedRace.abilities.map((ability, idx) => (
                      <li key={idx}>{ability}</li>
                    ))}
                  </ul>
                </section>
              )}

              {selectedRace.requirements && selectedRace.requirements.length > 0 && (
                <section>
                  <h3>Requirements</h3>
                  <ul className="requirement-list">
                    {selectedRace.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </section>
              )}

              {selectedRace.helpText && (
                <section>
                  <h3>Help Text</h3>
                  <pre className="help-text">{selectedRace.helpText}</pre>
                </section>
              )}

              <section>
                <h3>Metadata</h3>
                <div className="metadata">
                  <div className="meta-item">
                    <span className="meta-label">ID:</span>
                    <span className="meta-value">{selectedRace.id}</span>
                  </div>
                  {selectedRace.discovered && (
                    <div className="meta-item">
                      <span className="meta-label">Discovered:</span>
                      <span className="meta-value">{new Date(selectedRace.discovered).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Races;
