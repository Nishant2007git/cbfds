import React from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import CommandPalette from './CommandPalette.jsx';

const Layout = ({ children, title = 'Dashboard' }) => {
  return (
    <div className="layout-wrapper">
      <Sidebar />
      <main className="layout-content">
        <Header title={title} />
        <div className="page-body">{children}</div>
      </main>
      <CommandPalette />

      <style>{`
        .layout-wrapper {
          display: flex;
          min-height: 100vh;
        }

        .layout-content {
          flex: 1;
          margin-left: 288px; /* Sidebar 256px + 32px gap */
          padding: 16px 28px 40px 0;
          min-width: 0;
          transition: margin-left var(--duration-slow) var(--ease-out);
        }

        .page-body {
          animation: fadeInUp 0.4s var(--ease-out) both;
        }

        @media (max-width: 768px) {
          .layout-content {
            margin-left: 0;
            padding: 16px 16px 88px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
