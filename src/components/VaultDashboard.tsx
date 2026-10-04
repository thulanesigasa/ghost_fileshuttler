'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './VaultDashboard.module.css';
import {
  UploadCloudIcon,
  DownloadIcon,
  TrashIcon,
  SyncIcon,
  FileGenericIcon,
  GhostLogoIcon,
} from './Icons';
import { GhostModal } from './GhostModal';

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

interface VaultDashboardProps {
  initialFiles?: StoredFile[];
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} • ${d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return dateStr;
  }
}

export function VaultDashboard({ initialFiles = [] }: VaultDashboardProps) {
  const [files, setFiles] = useState<StoredFile[]>(initialFiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal State
  const [modalFile, setModalFile] = useState<StoredFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFilesJsonRef = useRef<string>('');

  const fetchFiles = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;

    try {
      setIsSyncing(true);
      const res = await fetch('/api/files', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.reload();
        return;
      }

      if (res.ok) {
        const data: StoredFile[] = await res.json();
        const jsonStr = JSON.stringify(data);
        if (jsonStr !== lastFilesJsonRef.current) {
          lastFilesJsonRef.current = jsonStr;
          setFiles(data);
        }
      }
    } catch (err) {
      console.error('File sync error:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 300);
    }
  }, []);

  // Real-time synchronization polling every 2 seconds
  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 2000);
    return () => clearInterval(interval);
  }, [fetchFiles]);

  const handleUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadFileName('');
          fetchFiles();
        }, 1000);
      } else {
        let msg = 'Upload rejected by server';
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) msg = res.error;
        } catch {
          // Fallback
        }
        setUploadError(msg);
        setIsUploading(false);
      }
    };

    xhr.onerror = () => {
      setUploadError('Network error occurred during file upload');
      setIsUploading(false);
    };

    xhr.send(formData);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!modalFile) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/delete/${modalFile.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== modalFile.id));
        setModalFile(null);
        fetchFiles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove file');
      }
    } catch {
      alert('Network failure during file removal');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalVaultBytes = files.reduce((acc, curr) => acc + (curr.file_size || 0), 0);

  return (
    <section className={styles.dashboard}>
      {/* Drag & Drop Upload Card */}
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileInputChange}
          className={styles.fileInputHidden}
        />
        <div className={styles.dropZoneContent}>
          <div className={styles.uploadIconWrapper}>
            <UploadCloudIcon size={32} />
          </div>
          <h2 className={styles.dropTitle}>SHUTTLE FILES TO VAULT</h2>
          <p className={styles.dropSubtitle}>
            Drag and drop files here, or <span className={styles.browseHighlight}>browse local device</span> to stream files to your secure LAN partition.
          </p>
        </div>
      </div>

      {/* Upload Progress Status */}
      {isUploading && (
        <div className={styles.uploadProgressCard} role="status">
          <div className={styles.progressInfo}>
            <span>Uploading: {uploadFileName}</span>
            <span className={styles.progressPercent}>{uploadProgress}%</span>
          </div>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className={styles.uploadStatusText}>
            Writing directly to host storage partition...
          </span>
        </div>
      )}

      {uploadError && (
        <div className={styles.uploadProgressCard}>
          <span className={styles.uploadErrorText}>{uploadError}</span>
        </div>
      )}

      {/* Files Inventory Section */}
      <div className={styles.inventorySection}>
        <div className={styles.inventoryHeader}>
          <div className={styles.titleArea}>
            <h3 className={styles.inventoryTitle}>VAULT INVENTORY</h3>
            <span className={styles.inventoryMeta}>
              {files.length} {files.length === 1 ? 'file' : 'files'} • {formatBytes(totalVaultBytes)}
            </span>
          </div>

          <div className={styles.syncIndicator}>
            <SyncIcon size={14} className={isSyncing ? styles.syncingIcon : ''} />
            <span>LAN Sync Active</span>
          </div>
        </div>

        {files.length > 0 && (
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        )}

        {filteredFiles.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <GhostLogoIcon size={48} color="var(--text-dim)" />
            </div>
            <h4 className={styles.emptyTitle}>Vault Partition Is Empty</h4>
            <p className={styles.emptySubtitle}>
              {searchQuery
                ? 'No files matched your search filter.'
                : 'No files uploaded to this partition yet. Drop or select files above to shuttle.'}
            </p>
          </div>
        ) : (
          <ul className={styles.fileList}>
            {filteredFiles.map((file) => (
              <li key={file.id} className={styles.fileItem}>
                <div className={styles.fileMainInfo}>
                  <div className={styles.fileIconWrapper}>
                    <FileGenericIcon size={20} />
                  </div>
                  <div className={styles.fileTextWrapper}>
                    <span className={styles.fileName} title={file.filename}>
                      {file.filename}
                    </span>
                    <div className={styles.fileMeta}>
                      <span>{formatBytes(file.file_size)}</span>
                      <span className={styles.fileDot}>•</span>
                      <span>{formatDate(file.uploaded_at)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.fileActions}>
                  <a
                    href={`/api/download/${file.id}`}
                    download={file.filename}
                    className={`${styles.actionBtn} ${styles.downloadBtn}`}
                    title="Download file to device"
                  >
                    <DownloadIcon size={18} />
                  </a>

                  <button
                    type="button"
                    onClick={() => setModalFile(file)}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="Permanently remove file"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirmation Modal for Permanent File Removal */}
      <GhostModal
        isOpen={Boolean(modalFile)}
        title="PERMANENTLY REMOVE FILE"
        message="Are you sure you want to permanently delete this file from the Ghost Vault storage partition?"
        highlightText={modalFile?.filename}
        confirmLabel={isDeleting ? 'Removing...' : 'Delete File'}
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => setModalFile(null)}
      />
    </section>
  );
}
