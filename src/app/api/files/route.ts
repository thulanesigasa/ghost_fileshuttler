import { NextResponse } from 'next/server';
import { getCurrentVaultId } from '@/lib/vault';
import { getFilesByVault } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const vaultId = await getCurrentVaultId();
  if (!vaultId) {
    return NextResponse.json(
      { error: 'Unauthorized. Ghost Key required.' },
      { status: 401 }
    );
  }

  const files = getFilesByVault(vaultId);
  return NextResponse.json(files);
}
