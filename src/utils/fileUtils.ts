// src/utils/fileUtils.ts - Unified file handling utilities
export interface FileInfo {
  url: string;
  filename: string;
  type: string;
  size?: number;
  uploadedAt?: Date;
}

// Simple file type detection
export function getFileType(filename: string, url?: string): string {
  const name = filename.toLowerCase();
  const urlLower = url?.toLowerCase() || "";

  if (name.endsWith(".pdf") || urlLower.includes(".pdf"))
    return "application/pdf";
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "image";
  if (name.match(/\.(doc|docx)$/)) return "document";
  if (name.match(/\.(xls|xlsx|csv)$/)) return "spreadsheet";
  return "file";
}

// Get appropriate icon for file type
export function getFileIcon(filename: string, url?: string): string {
  const type = getFileType(filename, url);

  switch (type) {
    case "application/pdf":
      return "📕";
    case "image":
      return "🖼️";
    case "document":
      return "📝";
    case "spreadsheet":
      return "📊";
    default:
      return "📄";
  }
}

// Check if file can be viewed in browser
export function canPreviewFile(filename: string, url?: string): boolean {
  const type = getFileType(filename, url);
  return type === "application/pdf" || type === "image";
}

// Format file size for display
export function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Simple filename decoder for Thai characters
export function decodeFilename(filename: string): string {
  if (!filename) return "Document";

  try {
    // Handle double-encoded filenames (%25 patterns)
    if (filename.includes("%25")) {
      const firstPass = decodeURIComponent(filename);
      if (firstPass.includes("%")) {
        return decodeURIComponent(firstPass);
      }
      return firstPass;
    }

    // Handle single-encoded filenames
    if (filename.includes("%")) {
      return decodeURIComponent(filename);
    }

    return filename;
  } catch {
    return filename;
  }
}

// Extract filename from URL
export function extractFilename(url: string): string {
  try {
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1].split("?")[0];
    return decodeFilename(filename) || "Document";
  } catch {
    return "Document";
  }
}

// Create FileInfo from URL
export function createFileInfo(url: string): FileInfo {
  const filename = extractFilename(url);
  const type = getFileType(filename, url);

  return {
    url,
    filename,
    type,
  };
}

// Safe download with proper filename
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
