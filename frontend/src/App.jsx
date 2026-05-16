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

import Layout from './components/Layout';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Rutas Privadas con Layout */}
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/businesses" element={<Layout><BusinessList /></Layout>} />
          <Route path="/branches" element={<Layout><GlobalBranchesList /></Layout>} />
          <Route path="/orders" element={<Layout><OrdersList /></Layout>} />
          <Route path="/business/:businessId/branches" element={<Layout><BranchManagement /></Layout>} />
          <Route path="/business/:businessId/orders" element={<Layout><OrdersList /></Layout>} />
          <Route path="/branch/:branchId/ai-config" element={<Layout><AIConfiguration /></Layout>} />
          <Route path="/chats" element={<Layout><Chats /></Layout>} />
          <Route path="/users" element={<Layout><UsersList /></Layout>} />
          <Route path="/ai-config" element={<Layout><GlobalBranchesList /></Layout>} />
          
          {/* Ruta por defecto */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
