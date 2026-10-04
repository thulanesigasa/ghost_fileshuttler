'use client';

import React, { useEffect } from 'react';
import styles from './GhostModal.module.css';
import { WarningIcon, ShieldLockIcon } from './Icons';

interface GhostModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  highlightText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GhostModal({
  isOpen,
  title,
  message,
  highlightText,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}: GhostModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div
            className={`${styles.iconWrapper} ${
              isDanger ? styles.iconDanger : styles.iconDefault
            }`}
          >
            {isDanger ? <WarningIcon size={22} /> : <ShieldLockIcon size={22} />}
          </div>
          <h2 className={styles.title}>{title}</h2>
        </div>

        <p className={styles.message}>
          {message}
          {highlightText && (
            <>
              <br />
              <span className={styles.highlight}>&ldquo;{highlightText}&rdquo;</span>
            </>
          )}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.btnCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${styles.btnConfirm} ${
              isDanger ? styles.btnDanger : styles.btnPrimary
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
