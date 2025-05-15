// src/interfaces/IHistoryRecord.ts - Enhanced with file metadata
export interface FileMetadata {
  url: string;
  filename: string;
  size?: number;
  type?: string;
  uploadedAt?: Date | string;
}

export interface IHistoryRecord {
  timestamp: Date | string;
  document_urls?: string[]; // Keep for backward compatibility
  // Add new field for enhanced file information
  documents?: FileMetadata[];
  notes?: string;
}