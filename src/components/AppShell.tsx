'use client';

import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  wide?: boolean;
}

export default function AppShell({ children, wide = false }: AppShellProps) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className={`main-content-inner${wide ? ' main-content-inner-wide' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
