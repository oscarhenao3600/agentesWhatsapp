import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Sun, Moon, Bot } from 'lucide-react';

const Layout = ({ children, theme, toggleTheme }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile Sticky Top Header */}
      <header className="mobile-navbar">
        <button 
          className="mobile-menu-btn" 
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
        
        <div className="mobile-logo-container">
          <Bot className="logo-icon-mobile" />
          <span className="logo-text-mobile">Agente<span className="gradient-text">WA</span></span>
        </div>
        
        <button 
          className="mobile-theme-btn" 
          onClick={toggleTheme}
          aria-label="Cambiar tema"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {/* Sidebar with Drawer Controls */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-container">
          {children}
        </div>
      </main>

    </div>
  );
};

export default Layout;
