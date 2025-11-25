import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import './index.css';

function AppContent() {

  return (
    <div className="app">
      <div className="sidebar">
        <h1>Apocalypse VI</h1>
        <nav>
          <NavLink to="/" end>
            MUD Map
          </NavLink>
          <hr style={{ margin: '10px 0', border: '1px solid #333' }} />
          <NavLink to="/admin">
            ⚙️ Admin
          </NavLink>
        </nav>
      </div>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map/:zoneId" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/rooms/:id" element={<Admin />} />
          <Route path="/admin/zones/:id" element={<Admin />} />
          <Route path="/admin/player_actions/:id" element={<Admin />} />
          <Route path="/admin/npcs/:id" element={<Admin />} />
          <Route path="/admin/npc_equipment/:id" element={<Admin />} />
          <Route path="/admin/npc_spells/:id" element={<Admin />} />
          <Route path="/admin/npc_dialogue/:id" element={<Admin />} />
          <Route path="/admin/npc_paths/:id" element={<Admin />} />
          <Route path="/admin/npc_spawn_info/:id" element={<Admin />} />
          <Route path="/admin/npc_flags/:id" element={<Admin />} />
          <Route path="/admin/npc_flag_instances/:id" element={<Admin />} />
          <Route path="/admin/character_positions/:id" element={<Admin />} />
          <Route path="/admin/items/:id" element={<Admin />} />
          <Route path="/admin/spells/:id" element={<Admin />} />
          <Route path="/admin/classes/:id" element={<Admin />} />
          <Route path="/admin/help_entries/:id" element={<Admin />} />
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
