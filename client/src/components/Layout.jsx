import React, { useState, Suspense, lazy } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import CommandPalette from "./CommandPalette.jsx";
import BackgroundAura from "./BackgroundAura.jsx";
import QuickActionDock from "./QuickActionDock.jsx";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal.jsx";

// Three.js background is heavy — lazy load it
const ThreeBackground = lazy(() => import("./ThreeBackground.jsx"));

const Layout = ({ children, title = "Dashboard" }) => {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <div className="layout-wrapper">
      {/* ── Three.js WebGL 3D background ── */}
      <Suspense fallback={null}>
        <ThreeBackground />
      </Suspense>

      {/* ── Ambient orb aura layer ── */}
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
