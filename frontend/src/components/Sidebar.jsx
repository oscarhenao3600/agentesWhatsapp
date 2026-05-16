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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
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
      path: '/businesses', // Solo admin ve lista global
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
      label: 'Configuración IA', 
      icon: <Bot size={20} />, 
      path: '/ai-config', 
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
    <aside className="main-sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <Bot className="logo-icon" />
          <span className="logo-text">Agente<span className="gradient-text">WA</span></span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {filteredItems.map((item, index) => (
          <NavLink 
            key={index}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
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
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <style jsx>{`
        .main-sidebar {
          width: 260px;
          height: 100vh;
          background: rgba(15, 15, 15, 0.8);
          backdrop-filter: blur(20px);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
        }

        .sidebar-header {
          padding: 30px 24px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          color: var(--accent-primary);
          width: 32px;
          height: 32px;
        }

        .logo-text {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 12px;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--accent-primary);
          color: white;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }

        .nav-label {
          font-size: 15px;
          font-weight: 500;
          flex: 1;
        }

        .arrow-icon {
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.2s;
        }

        .nav-item:hover .arrow-icon,
        .nav-item.active .arrow-icon {
          opacity: 0.5;
          transform: translateX(0);
        }

        .sidebar-footer {
          padding: 24px;
          border-top: 1px solid var(--border-color);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: var(--gradient-primary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
        }

        .user-role {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: capitalize;
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: none;
          border: none;
          color: #ef4444;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
