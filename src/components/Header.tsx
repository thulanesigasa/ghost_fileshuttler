'use client';

import React, { useState } from 'react';
import styles from './Header.module.css';
import { GhostLogoIcon, LockIcon, CopyIcon, CheckIcon } from './Icons';

interface HeaderProps {
  nodeIp: string;
  lanIp: string;
  isAuthenticated: boolean;
  onLockVault: () => void;
}

export function Header({
  nodeIp,
  lanIp,
  isAuthenticated,
  onLockVault,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLan = async () => {
    try {
      const port = window.location.port ? `:${window.location.port}` : '';
      const url = `http://${lanIp}${port}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <a href="/" className={styles.brand}>
          <GhostLogoIcon size={30} className={styles.logoIcon} />
          <span className={styles.brandText}>
            Ghost<span className={styles.brandSub}>_FS</span>
          </span>
        </a>

        <div className={styles.actions}>
          <div className={styles.nodeInfo}>
            <div>
              NODE_ID: <strong>{nodeIp || 'localhost'}</strong>
            </div>
            <div className={styles.lanWrapper}>
              <span>LAN_IP: <strong>{lanIp || '127.0.0.1'}</strong></span>
              <button
                type="button"
                onClick={handleCopyLan}
                className={styles.copyBtn}
                title="Copy mobile access URL"
              >
                {copied ? <CheckIcon size={12} color="var(--accent-cyan)" /> : <CopyIcon size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {isAuthenticated && (
            <button
              type="button"
              onClick={onLockVault}
              className={styles.lockBtn}
              title="Lock and clear current vault credentials"
            >
              <LockIcon size={16} />
              <span>Lock Vault</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
