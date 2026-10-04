import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import { getCurrentVaultId } from '@/lib/vault';
import { getFileById, deleteFile } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function handleDelete(
  request: NextRequest,
  params: Promise<{ id: string }>
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

    // Attempt to remove physical file if it exists
    if (fs.existsSync(record.filepath)) {
      try {
        await fs.promises.unlink(record.filepath);
      } catch (fileErr) {
        console.warn('Physical file deletion warning:', fileErr);
      }
    }

    // Delete record from database
    const removed = deleteFile(fileId, vaultId);
    if (!removed) {
      return NextResponse.json(
        { error: 'Failed to delete file record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      id: fileId,
    });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json(
      { error: 'Server error while deleting file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleDelete(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleDelete(request, params);
}
