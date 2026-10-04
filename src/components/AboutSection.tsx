'use client';

import React from 'react';
import styles from './AboutSection.module.css';
import { ShieldLockIcon, WifiIcon, KeyIcon } from './Icons';

interface AboutSectionProps {
  lanIp: string;
}

export function AboutSection({ lanIp }: AboutSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.cardsGrid}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <WifiIcon size={24} />
          </div>
          <h4 className={styles.cardTitle}>ZERO CLOUD EXPOSURE</h4>
          <p className={styles.cardDescription}>
            Files transfer directly between your local devices over high-speed Wi-Fi. Data is never routed through third-party servers, internet gateways, or telemetry trackers.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <KeyIcon size={24} />
          </div>
          <h4 className={styles.cardTitle}>ISOLATED TENANT VAULTS</h4>
          <p className={styles.cardDescription}>
            Every unique PIN generates an isolated cryptographic vault index via SHA-256 hashing. Multiple users or devices on the same Wi-Fi maintain private storage partitions.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <ShieldLockIcon size={24} />
          </div>
          <h4 className={styles.cardTitle}>CROSS-PLATFORM STREAMING</h4>
          <p className={styles.cardDescription}>
            Instantly shuttle documents, media, and binaries between Android, iOS, Windows, macOS, and Linux without installing native helper apps or client software.
          </p>
        </div>
      </div>

      <div className={styles.guideBanner}>
        <div className={styles.guideHeader}>
          <WifiIcon size={22} color="var(--accent-cyan)" />
          <h3 className={styles.guideTitle}>MOBILE ACCESS SETUP</h3>
        </div>

        <ol className={styles.stepsList}>
          <li className={styles.stepItem}>
            <span className={styles.stepNumber}>STEP 01</span>
            <span className={styles.stepHeading}>Connect to Same Wi-Fi</span>
            <span className={styles.stepText}>
              Ensure your mobile device or secondary tablet is connected to the same wireless local area network as this host node.
            </span>
          </li>

          <li className={styles.stepItem}>
            <span className={styles.stepNumber}>STEP 02</span>
            <span className={styles.stepHeading}>Open Mobile Browser</span>
            <span className={styles.stepText}>
              Navigate to <span className={styles.codeBadge}>http://{lanIp || '192.168.x.x'}:3000</span> directly in Safari, Chrome, or Firefox.
            </span>
          </li>

          <li className={styles.stepItem}>
            <span className={styles.stepNumber}>STEP 03</span>
            <span className={styles.stepHeading}>Enter Vault Key</span>
            <span className={styles.stepText}>
              Input the same PIN you created on desktop to unlock and synchronize your files in real time.
            </span>
          </li>
        </ol>
      </div>
    </section>
  );
}
