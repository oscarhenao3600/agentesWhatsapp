import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';

import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import BranchManagement from './pages/BranchManagement';
import AIConfiguration from './pages/AIConfiguration';
import OrdersList from './pages/OrdersList';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <AuthProvider>
      <Router>
        <header style={{ padding: '20px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="gradient-text">AI Agent Manager</h1>
            <button onClick={toggleTheme} className="btn-secondary" style={{ padding: '8px' }}>
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        <main style={{ padding: '40px 0' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/business/:businessId/branches" element={<BranchManagement />} />
            <Route path="/business/:businessId/orders" element={<OrdersList />} />
            <Route path="/branch/:branchId/ai-config" element={<AIConfiguration />} />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
