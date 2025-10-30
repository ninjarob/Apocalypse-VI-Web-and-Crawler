import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
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
            MUD Map
          </NavLink>
          <hr style={{ margin: '10px 0', border: '1px solid #333' }} />
          <NavLink to="/admin" onClick={handleAdminClick}>
            ⚙️ Admin
          </NavLink>
        </nav>
      </div>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
