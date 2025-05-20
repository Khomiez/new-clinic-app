// src/utils/thaiFilenameFixUtils.ts - Specialized utilities for handling encoded Thai filenames

/**
 * Specialized function to decode potentially double-encoded Thai filenames
 * Handles cases where the filename appears as %25E0%25B8%2594... (double-encoded)
 */
export function decodeThaiFilename(encodedName: string): string {
  if (!encodedName) return "Document";

  // Check if this is a double-encoded filename (contains %25 which is the encoded % character)
  if (encodedName.includes("%25")) {
    try {
      // First decode once - this turns %25 into % characters
      const firstPass = decodeURIComponent(encodedName);

      // If the result still has % characters, it was indeed double-encoded
      if (firstPass.includes("%")) {
        try {
          // Decode the second layer
          return decodeURIComponent(firstPass);
        } catch (e) {
          console.warn("Failed second-level decoding of Thai filename:", e);
          return firstPass; // Return the first-level decoded string
        }
      }
      return firstPass;
    } catch (e) {
      console.warn("Failed first-level decoding of Thai filename:", e);
    }
  }

  // Handle regular encoded filenames (just encoded once)
  if (encodedName.includes("%")) {
    try {
      return decodeURIComponent(encodedName);
    } catch (e) {
      console.warn("Failed to decode filename:", e);
    }
  }

  // Return original if not encoded or decoding failed
  return encodedName;
}

/**
 * Extract a clean filename from a URL that might contain encoded Thai characters
 */
export function extractThaiFilenameFromUrl(url: string): string {
  if (!url) return "Document";

  try {
    // Extract the filename portion from the URL
    const urlParts = url.split("/");
    let rawFilename = urlParts[urlParts.length - 1];

    // Remove query parameters if any
    if (rawFilename.includes("?")) {
      rawFilename = rawFilename.split("?")[0];
    }

    // Apply Thai character decoding
    return decodeThaiFilename(rawFilename);
  } catch (e) {
    console.error("Error extracting Thai filename from URL:", e);
    return "Document";
  }
}

/**
 * Quick check if a string contains encoded Thai characters
 */
export function containsEncodedThai(str: string): boolean {
  // Thai Unicode code points are in the range \u0E00-\u0E7F
  // When URL encoded, they start with patterns like %E0%B8, %E0%B9, etc.

  // Check for double-encoded patterns (%25E0%25B8, %25E0%25B9)
  if (str.match(/%25E0%25B[8-9]/i)) {
    return true;
  }

  // Check for single-encoded patterns (%E0%B8, %E0%B9)
  if (str.match(/%E0%B[8-9]/i)) {
    return true;
  }

  return false;
}

/**
 * Create a safe downloadable filename from potentially encoded Thai filename
 */
export function createSafeDownloadFilename(
  filename: string,
  fallbackExtension?: string
): string {
  // Decode Thai characters if they exist
  const decodedName = decodeThaiFilename(filename);

  // Check if the filename has an extension
  const hasExtension = /\.\w{2,4}$/.test(decodedName);

  // If no extension and fallback provided, add it
  if (!hasExtension && fallbackExtension) {
    return `${decodedName}.${fallbackExtension.replace(/^\./, "")}`;
  }

  return decodedName;
}
