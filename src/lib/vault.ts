import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { cookies } from 'next/headers';

export const VAULT_DIR = path.join(process.cwd(), 'shuttle_vault');
export const SESSION_COOKIE_NAME = 'ghost_vault_token';

if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

export async function getCurrentVaultId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME);
  if (!token || !token.value) {
    return null;
  }
  return token.value;
}

export function sanitizeFilename(raw: string): string {
  // Strip null bytes and directory traversal characters
  const clean = path.basename(raw).replace(/[^a-zA-Z0-9._\-\s]/g, '_');
  return clean || 'ghost_file_' + Date.now();
}

export function getNetworkInfo(): { nodeIp: string; lanIp: string } {
  let detectedLan = '';
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    const list = nets[name];
    if (!list) continue;
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) {
        // Prioritize standard local subnet IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          net.address.startsWith('172.')
        ) {
          detectedLan = net.address;
          break;
        } else if (!detectedLan) {
          detectedLan = net.address;
        }
      }
    }
    if (detectedLan && detectedLan.startsWith('192.168.')) break;
  }

  const lanIp = process.env.LAN_IP || detectedLan || '127.0.0.1';
  const nodeIp = os.hostname() || 'ghost-node-01';

  return { nodeIp, lanIp };
}
