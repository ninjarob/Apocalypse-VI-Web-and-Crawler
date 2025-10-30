import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import NPCs from './pages/NPCs';
import Items from './pages/Items';
import Spells from './pages/Spells';
import Commands from './pages/Commands';
import Races from './pages/Races';
import Admin from './pages/Admin';
import './index.css';

function AppContent() {
  const location = useLocation();
  const [adminKey, setAdminKey] = useState(0);

  const handleAdminClick = (e: React.MouseEvent) => {
    // If already on admin page, force remount by changing key
    if (location.pathname === '/admin') {
      e.preventDefault();
      setAdminKey(prev => prev + 1);
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h1>Apocalypse VI</h1>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/rooms">Rooms</NavLink>
          <NavLink to="/npcs">NPCs</NavLink>
          <NavLink to="/items">Items</NavLink>
          <NavLink to="/spells">Spells</NavLink>
          <NavLink to="/commands">Commands</NavLink>
          <NavLink to="/races">Races</NavLink>
          <hr style={{ margin: '10px 0', border: '1px solid #333' }} />
          <NavLink to="/admin" onClick={handleAdminClick}>
            ⚙️ Admin
          </NavLink>
        </nav>
      </div>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/npcs" element={<NPCs />} />
          <Route path="/items" element={<Items />} />
          <Route path="/spells" element={<Spells />} />
          <Route path="/commands" element={<Commands />} />
          <Route path="/races" element={<Races />} />
          <Route path="/admin" element={<Admin key={adminKey} />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
