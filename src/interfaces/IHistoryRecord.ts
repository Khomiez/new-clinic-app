// src/interfaces/IHistoryRecord.ts
export interface IHistoryRecord {
  timestamp: Date | string;
  document_urls: string[];
  notes: string;
}