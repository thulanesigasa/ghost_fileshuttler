import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { getCurrentVaultId, sanitizeFilename, VAULT_DIR } from '@/lib/vault';
import { insertFile } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const vaultId = await getCurrentVaultId();
    if (!vaultId) {
      return NextResponse.json(
        { error: 'Unauthorized. Ghost Key required.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || typeof file === 'string' || !file.name) {
      return NextResponse.json(
        { error: 'No file uploaded or invalid file format' },
        { status: 400 }
      );
    }

    const uniqueId = crypto.randomUUID().slice(0, 12);
    const cleanName = sanitizeFilename(file.name);
    const storedName = `${uniqueId}_${cleanName}`;
    const filePath = path.join(VAULT_DIR, storedName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);

    const record = insertFile({
      vaultId,
      filename: file.name,
      storedName,
      filepath: filePath,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    });

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      file: record,
    });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json(
      { error: 'File upload failed due to a server error' },
      { status: 500 }
    );
  }
}
