import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import CommandPalette from './CommandPalette.jsx';
import BackgroundAura from './BackgroundAura.jsx';
import QuickActionDock from './QuickActionDock.jsx';
import KeyboardShortcutsModal from './KeyboardShortcutsModal.jsx';

const Layout = ({ children, title = 'Dashboard' }) => {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <div className="layout-wrapper">
      {/* Dynamic ambient particles & glowing orbs */}
      <BackgroundAura />

      <Sidebar />
      <main className="layout-content">
        <Header title={title} />
        <div className="page-body">{children}</div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Floating Quick Action HUD */}
      <QuickActionDock onOpenShortcuts={setShortcutsOpen} />

      {/* Interactive Keyboard Shortcuts Cheat Sheet */}
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={setShortcutsOpen} />
    </div>
  );
};

export default Layout;
