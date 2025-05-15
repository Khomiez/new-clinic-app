// src/utils/fileHelpers.ts - Client-side only file utilities (without Cloudinary imports)
export interface FileInfo {
  url: string;
  filename: string;
  type: string;
  size?: number;
  uploadedAt?: Date;
}

// Helper to detect file type from URL or extension
export function detectFileType(url: string, filename?: string): string {
  const urlLower = url.toLowerCase();
  const filenameLower = filename?.toLowerCase() || "";

  // PDF files
  if (urlLower.includes(".pdf") || filenameLower.endsWith(".pdf")) {
    return "application/pdf";
  }

  // Image files
  if (urlLower.match(/\.(jpg|jpeg)/) || filenameLower.match(/\.(jpg|jpeg)$/)) {
    return "image/jpeg";
  }
  if (urlLower.includes(".png") || filenameLower.endsWith(".png")) {
    return "image/png";
  }
  if (urlLower.includes(".gif") || filenameLower.endsWith(".gif")) {
    return "image/gif";
  }
  if (urlLower.includes(".webp") || filenameLower.endsWith(".webp")) {
    return "image/webp";
  }

  // Document files
  if (urlLower.includes(".doc") || filenameLower.endsWith(".doc")) {
    return "application/msword";
  }
  if (urlLower.includes(".docx") || filenameLower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (urlLower.includes(".xls") || filenameLower.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }
  if (urlLower.includes(".xlsx") || filenameLower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/octet-stream";
}

// Extract public ID from Cloudinary URL (client-side safe version)
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Match Cloudinary URL patterns
    const patterns = [
      // Standard pattern: /v<version>/<public_id>.<extension>
      /\/v\d+\/([^/?]+)\.[^/?]+/,
      // Folder pattern: /v<version>/<folder>/<public_id>.<extension>
      /\/v\d+\/(.+)\.[^/?]+/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Remove file extension from public_id
        return match[1].split(".")[0];
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

// Enhanced filename extraction with fallback strategies
export function extractOriginalFilename(url: string, context?: any): string {
  try {
    // Strategy 1: Check if context contains original filename
    if (context?.original_filename) {
      return context.original_filename;
    }

    // Strategy 2: Extract from Cloudinary public_id
    const publicId = extractPublicIdFromUrl(url);
    if (publicId) {
      // Parse the public_id structure: folder/subfolder/filename_timestamp
      const parts = publicId.split("/");
      const filenamePart = parts[parts.length - 1];

      // Remove timestamp suffix (last part after underscore if it looks like a timestamp)
      const withoutTimestamp = filenamePart.replace(/_\d{13,}$/, "");

      // Replace underscores with spaces and add appropriate extension
      const reconstructed = withoutTimestamp.replace(/_/g, " ");
      const extension = getFileExtensionFromUrl(url);

      return extension ? `${reconstructed}.${extension}` : reconstructed;
    }

    // Strategy 3: Extract from URL path
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1].split("?")[0];

    // If URL contains a meaningful filename, use it
    if (filename && !filename.match(/^[a-f0-9]+$/)) {
      return decodeURIComponent(filename);
    }

    // Strategy 4: Fallback to generic name with proper extension
    const extension = getFileExtensionFromUrl(url);
    return extension ? `Document.${extension}` : "Document";
  } catch (error) {
    console.error("Error extracting filename:", error);
    return "Document";
  }
}

// Get file extension from URL
export function getFileExtensionFromUrl(url: string): string {
  try {
    // Check for common Cloudinary transformations
    const transformMatch = url.match(
      /\/([^\/]+)\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx)[^\/]*$/i
    );
    if (transformMatch) {
      return transformMatch[2].toLowerCase();
    }

    // Fallback to basic extension check
    const match = url.match(/\.([^.?]+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : "";
  } catch (error) {
    return "";
  }
}

// Generate appropriate icon for file type
export function getFileIcon(filename: string, url?: string): string {
  const lower = filename.toLowerCase();
  const urlLower = url?.toLowerCase() || "";

  if (lower.endsWith(".pdf") || urlLower.includes(".pdf")) return "📕";
  if (
    lower.match(/\.(jpg|jpeg|png|gif|webp)$/) ||
    urlLower.match(/\.(jpg|jpeg|png|gif|webp)/)
  )
    return "🖼️";
  if (lower.match(/\.(doc|docx)$/) || urlLower.match(/\.(doc|docx)/))
    return "📝";
  if (lower.match(/\.(xls|xlsx|csv)$/) || urlLower.match(/\.(xls|xlsx|csv)/))
    return "📊";
  if (lower.match(/\.(ppt|pptx)$/) || urlLower.match(/\.(ppt|pptx)/))
    return "📊";
  if (lower.match(/\.(txt|rtf)$/) || urlLower.match(/\.(txt|rtf)/)) return "📄";
  if (lower.match(/\.(zip|rar|7z)$/) || urlLower.match(/\.(zip|rar|7z)/))
    return "🗜️";

  return "📄"; // Default document icon
}

// Check if file is viewable in browser
export function isFileViewable(filename: string, url?: string): boolean {
  const lower = filename.toLowerCase();
  const urlLower = url?.toLowerCase() || "";

  // PDFs are viewable
  if (lower.endsWith(".pdf") || urlLower.includes(".pdf")) return true;

  // Images are viewable
  if (
    lower.match(/\.(jpg|jpeg|png|gif|webp)$/) ||
    urlLower.match(/\.(jpg|jpeg|png|gif|webp)/)
  )
    return true;

  // Text files can be viewed
  if (lower.match(/\.(txt|html|css|js|json|xml)$/)) return true;

  return false;
}

// Format file size for display
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Enhanced file info extraction combining all strategies
export function extractFileInfo(url: string, context?: any): FileInfo {
  const filename = extractOriginalFilename(url, context);
  const type = detectFileType(url, filename);

  return {
    url,
    filename,
    type,
    // Size and uploadedAt would come from metadata if available
    size: context?.size,
    uploadedAt: context?.uploadedAt ? new Date(context.uploadedAt) : undefined,
  };
}
