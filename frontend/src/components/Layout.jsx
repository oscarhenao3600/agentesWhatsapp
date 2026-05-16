import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="content-container">
          {children}
        </div>
      </main>

      <style jsx>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .main-content {
          flex: 1;
          margin-left: 260px; /* Ancho del sidebar */
          padding: 40px;
          min-height: 100vh;
          position: relative;
        }

        .content-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 1024px) {
          .main-content {
            margin-left: 0;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
