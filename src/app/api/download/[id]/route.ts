import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import { getCurrentVaultId } from '@/lib/vault';
import { getFileById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const vaultId = await getCurrentVaultId();
    if (!vaultId) {
      return NextResponse.json(
        { error: 'Unauthorized. Ghost Key required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const fileId = parseInt(id, 10);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const record = getFileById(fileId, vaultId);
    if (!record) {
      return NextResponse.json(
        { error: 'File not found or unauthorized' },
        { status: 404 }
      );
    }

    if (!fs.existsSync(record.filepath)) {
      return NextResponse.json(
        { error: 'Physical file missing from vault storage' },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.promises.readFile(record.filepath);
    const headers = new Headers();
    
    // Set headers for file download
    headers.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(record.filename)}"; filename*=UTF-8''${encodeURIComponent(record.filename)}`
    );
    headers.set('Content-Type', record.mime_type || 'application/octet-stream');
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Cache-Control', 'no-store');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}
