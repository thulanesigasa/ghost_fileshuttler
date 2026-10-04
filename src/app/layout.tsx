import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ghost_FileShuttler | Ultra-Secure LAN File Vault',
  description:
    'A production-ready, ultra-secure, and lightning-fast local-network file-sharing system. Designed with a Ghost Cyan aesthetic for peer transfers without leaving your LAN.',
  keywords: [
    'local network file transfer',
    'LAN file shuttler',
    'secure local vault',
    'ghost fileshuttler',
    'peer to peer LAN sharing',
  ],
  authors: [{ name: 'Thulane Sigasa' }],
  openGraph: {
    title: 'Ghost_FileShuttler | Ultra-Secure LAN File Vault',
    description:
      'Lightning-fast file transfers between mobile, desktop, and tablets on your local network.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Ghost_FileShuttler',
              operatingSystem: 'Cross-Platform',
              applicationCategory: 'File Sharing Application',
              description:
                'A secure local-network file-sharing system designed for speed and simplicity.',
              isAccessibleForFree: true,
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
