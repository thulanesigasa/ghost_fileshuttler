import { NextResponse } from 'next/server';
import { getCurrentVaultId, getNetworkInfo } from '@/lib/vault';

export async function GET() {
  const vaultId = await getCurrentVaultId();
  const { nodeIp, lanIp } = getNetworkInfo();

  return NextResponse.json({
    nodeIp,
    lanIp,
    isAuthenticated: Boolean(vaultId),
  });
}
