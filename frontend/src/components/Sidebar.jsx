import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  MapPin, 
  ShoppingBag, 
  Users, 
  MessageSquare, 
  Settings, 
  Bot,
  LogOut,
  ChevronRight,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose, theme, toggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { 
      label: 'Dashboard', 
      icon: <LayoutDashboard size={20} />, 
      path: '/dashboard',
      roles: ['admin', 'client', 'user']
    },
    { 
      label: 'Negocios', 
      icon: <Building2 size={20} />, 
      path: '/businesses', 
      roles: ['admin']
    },
    { 
      label: 'Sucursales', 
      icon: <MapPin size={20} />, 
      path: '/branches', 
      roles: ['admin', 'client']
    },
    { 
      label: 'Pedidos', 
      icon: <ShoppingBag size={20} />, 
      path: '/orders', 
      roles: ['admin', 'client', 'user']
    },
    { 
      label: 'Chats', 
      icon: <MessageSquare size={20} />, 
      path: '/chats', 
      roles: ['admin', 'client', 'user']
    },
    { 
      label: 'Reportes y Comisiones', 
      icon: <ShoppingBag size={20} />, 
      path: '/reports/commissions', 
      roles: ['admin', 'client']
    },
    { 
      label: 'Usuarios', 
      icon: <Users size={20} />, 
      path: '/users', 
      roles: ['admin']
    }
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Drawer Overlay for Mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`main-sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <Bot className="logo-icon" />
            <span className="logo-text">Agente<span className="gradient-text">WA</span></span>
          </div>
          
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredItems.map((item, index) => (
            <NavLink 
              key={index}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <ChevronRight className="arrow-icon" size={14} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          
          {/* Theme Toggle Button inside Sidebar */}
          <button onClick={toggleTheme} className="theme-toggle-btn-sidebar">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>Tema {theme === 'light' ? 'Oscuro' : 'Claro'}</span>
          </button>

          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
