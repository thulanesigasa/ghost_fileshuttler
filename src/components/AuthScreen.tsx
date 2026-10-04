'use client';

import React, { useState } from 'react';
import styles from './AuthScreen.module.css';
import { ShieldLockIcon, KeyIcon, WarningIcon } from './Icons';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your Ghost Vault PIN');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        onAuthenticated();
      } else {
        setError(data.error || 'Authentication rejected by Ghost Node');
      }
    } catch {
      setError('Connection failure. Check if Ghost Node is reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.authWrapper}>
      <div className={styles.authCard}>
        <div className={styles.iconWrapper}>
          <ShieldLockIcon size={32} />
        </div>

        <h1 className={styles.title}>GHOST_VAULT ACCESS</h1>
        <p className={styles.description}>
          Enter your personal PIN to unlock your encrypted local partition. Each unique PIN automatically provisions a private, isolated tenant vault.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="pin-input" className={styles.label}>
              ENTER GHOST KEY (PIN)
            </label>
            <div className={styles.inputContainer}>
              <div className={styles.inputIcon}>
                <KeyIcon size={18} />
              </div>
              <input
                id="pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="current-password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className={styles.input}
                autoFocus
                required
              />
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage} role="alert">
              <WarningIcon size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? 'AUTHENTICATING...' : 'UNLOCK VAULT'}
          </button>
        </form>

        <div className={styles.hints}>
          <strong>Local Network Privacy:</strong> Files shuttled through this node are stored locally on the host machine. All traffic remains completely within your LAN subnet.
        </div>
      </div>
    </main>
  );
}
