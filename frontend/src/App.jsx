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
import Chats from './pages/Chats';
import BusinessList from './pages/BusinessList';
import GlobalBranchesList from './pages/GlobalBranchesList';
import UsersList from './pages/UsersList';

import CommissionsReport from './pages/CommissionsReport';
import Layout from './components/Layout';

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    // Detect system preferred theme on device
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for device system theme changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      // Only auto-switch if the user has not manually set a preference
      if (!localStorage.getItem('theme_preference')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    // Record that user manually overrode the theme preference
    localStorage.setItem('theme_preference', 'manual');
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const renderWithLayout = (component) => {
    return (
      <Layout theme={theme} toggleTheme={toggleTheme}>
        {component}
      </Layout>
    );
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Rutas Privadas con Layout */}
          <Route path="/dashboard" element={renderWithLayout(<Dashboard />)} />
          <Route path="/businesses" element={renderWithLayout(<BusinessList />)} />
          <Route path="/branches" element={renderWithLayout(<GlobalBranchesList />)} />
          <Route path="/orders" element={renderWithLayout(<OrdersList />)} />
          <Route path="/business/:businessId/branches" element={renderWithLayout(<BranchManagement />)} />
          <Route path="/business/:businessId/orders" element={renderWithLayout(<OrdersList />)} />
          <Route path="/branch/:branchId/ai-config" element={renderWithLayout(<AIConfiguration />)} />
          <Route path="/chats" element={renderWithLayout(<Chats />)} />
          <Route path="/users" element={renderWithLayout(<UsersList />)} />
          <Route path="/ai-config" element={renderWithLayout(<GlobalBranchesList />)} />
          <Route path="/reports/commissions" element={renderWithLayout(<CommissionsReport />)} />
          
          {/* Ruta por defecto */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
