import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'shuttler.db');

export interface StoredFile {
  id: number;
  vault_id: string;
  filename: string;
  stored_name: string;
  filepath: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new DatabaseSync(DB_PATH);
  
  // Initialize SQLite schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      filepath TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_files_vault_id ON files(vault_id);
    CREATE INDEX IF NOT EXISTS idx_files_uploaded ON files(uploaded_at);
  `);

  dbInstance = db;
  return db;
}

export function getFilesByVault(vaultId: string): StoredFile[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id, vault_id, filename, stored_name, filepath, file_size, mime_type, uploaded_at 
    FROM files 
    WHERE vault_id = ? 
    ORDER BY uploaded_at DESC
  `);
  return stmt.all(vaultId) as unknown as StoredFile[];
}

export function getFileById(fileId: number, vaultId: string): StoredFile | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id, vault_id, filename, stored_name, filepath, file_size, mime_type, uploaded_at 
    FROM files 
    WHERE id = ? AND vault_id = ?
  `);
  const result = stmt.get(fileId, vaultId);
  return (result as unknown as StoredFile) || null;
}

export function insertFile(file: {
  vaultId: string;
  filename: string;
  storedName: string;
  filepath: string;
  fileSize: number;
  mimeType: string;
}): StoredFile {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO files (vault_id, filename, stored_name, filepath, file_size, mime_type, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    RETURNING id, vault_id, filename, stored_name, filepath, file_size, mime_type, uploaded_at
  `);
  const result = stmt.get(
    file.vaultId,
    file.filename,
    file.storedName,
    file.filepath,
    file.fileSize,
    file.mimeType
  );
  return result as unknown as StoredFile;
}

export function deleteFile(fileId: number, vaultId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM files WHERE id = ? AND vault_id = ?`);
  const result = stmt.run(fileId, vaultId);
  return result.changes > 0;
}
