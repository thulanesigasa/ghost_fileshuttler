'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AuthScreen } from '@/components/AuthScreen';
import { VaultDashboard } from '@/components/VaultDashboard';
import { AboutSection } from '@/components/AboutSection';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [nodeIp, setNodeIp] = useState<string>('ghost-node');
  const [lanIp, setLanIp] = useState<string>('127.0.0.1');
  const [loading, setLoading] = useState<boolean>(true);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/network', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNodeIp(data.nodeIp);
        setLanIp(data.lanIp);
        setIsAuthenticated(data.isAuthenticated);
      }
    } catch (err) {
      console.error('Failed to query network status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleLockVault = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Lock vault error:', err);
    }
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--accent-cyan)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem',
          letterSpacing: '0.05em',
        }}
      >
        INITIALIZING GHOST NODE...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        nodeIp={nodeIp}
        lanIp={lanIp}
        isAuthenticated={isAuthenticated}
        onLockVault={handleLockVault}
      />

      <main style={{ flexGrow: 1 }}>
        {!isAuthenticated ? (
          <AuthScreen onAuthenticated={handleAuthenticated} />
        ) : (
          <VaultDashboard />
        )}

        <AboutSection lanIp={lanIp} />
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div>GHOST_FILESHUTTLER • FULL-STACK NEXT.JS LOCAL VAULT</div>
      </footer>
    </div>
  );
}
