// src/utils/temporaryFileStorage.ts - Utility for managing temporary file storage
export interface TemporaryFile {
  id: string;
  file: File;
  recordIndex: number;
  filename: string;
  size: number;
  type: string;
  previewUrl?: string; // For local preview
  timestamp: number;
}

export interface PendingUpload {
  recordIndex: number;
  documentIndex: number;
  tempFile: TemporaryFile;
}

/**
 * Create a temporary file object for storage
 */
export function createTemporaryFile(
  file: File,
  recordIndex: number
): TemporaryFile {
  const id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    file,
    recordIndex,
    filename: file.name,
    size: file.size,
    type: file.type,
    timestamp: Date.now(),
  };
}

/**
 * Create a preview URL for temporary files
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Clean up preview URLs to prevent memory leaks
 */
export function revokeFilePreviewUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Check if a URL is a temporary file URL
 */
export function isTemporaryFileUrl(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("temp_");
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

// Import shared utilities from fileUtils to avoid duplication
import {
  formatFileSize,
  canPreviewFile as canPreviewFileUtil,
} from "./fileUtils";

/**
 * Check if file type can be previewed (wrapper for consistency)
 */
export function canPreviewFile(file: File): boolean {
  return canPreviewFileUtil(file.name, "");
}

// Re-export formatFileSize for convenience
export { formatFileSize };

/**
 * Validate file before adding to temporary storage
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 10
): string | null {
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File size exceeds ${maxSizeMB}MB limit`;
  }

  // Check file type
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (!allowedTypes.includes(file.type)) {
    return `File type not supported. Allowed types: PDF, Images, Word documents, Excel files`;
  }

  return null;
}
