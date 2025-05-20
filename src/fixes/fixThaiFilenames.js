// src/fixes/fixThaiFilenames.js - Direct fix for double-encoded Thai filenames
// This is a standalone fix you can apply to quickly resolve the Thai filename issue

/**
 * Apply this fix immediately after your app loads to fix Thai filename displays
 */
export function applyThaiFilenamesFix() {
  // Function to decode double-encoded Thai filenames
  function decodeDoubleEncodedThai(text) {
    if (!text || typeof text !== "string") return text;

    // Check for double-encoded pattern (%25 is the encoded % character)
    if (text.includes("%25")) {
      try {
        // First decode to get %E0%B8...
        const firstDecode = decodeURIComponent(text);
        // If the result still has % characters, it was double-encoded
        if (firstDecode.includes("%")) {
          try {
            // Second decode to get Thai characters
            return decodeURIComponent(firstDecode);
          } catch (e) {
            console.warn("Second decoding failed:", e);
            return firstDecode;
          }
        }
        return firstDecode;
      } catch (e) {
        console.warn("First decoding failed:", e);
        return text;
      }
    }

    // Try single decoding if it contains % but not %25
    if (text.includes("%")) {
      try {
        return decodeURIComponent(text);
      } catch (e) {
        return text;
      }
    }

    return text;
  }

  // 1. Fix displayed filenames on the page
  function fixDisplayedFilenames() {
    // Find all elements that might contain file names
    const fileNameElements = document.querySelectorAll(
      ".file-name, [data-filename], .filename"
    );
    fileNameElements.forEach((el) => {
      // Fix text content if it looks like an encoded Thai filename
      if (el.textContent && el.textContent.includes("%25E0%25B8")) {
        el.textContent = decodeDoubleEncodedThai(el.textContent);
      }

      // Also fix any title attributes (tooltips)
      if (
        el.getAttribute("title") &&
        el.getAttribute("title").includes("%25")
      ) {
        el.setAttribute(
          "title",
          decodeDoubleEncodedThai(el.getAttribute("title"))
        );
      }
    });
  }

  // 2. Apply the fix now for current elements
  fixDisplayedFilenames();

  // 3. Apply the fix when DOM changes (for newly added elements)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" || mutation.type === "characterData") {
        fixDisplayedFilenames();
      }
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // 4. Override the download functionality to use correct Thai filenames
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function (tagName) {
    const element = originalCreateElement(tagName);

    // If this is an anchor element (<a>), enhance its download attribute setter
    if (tagName.toLowerCase() === "a") {
      const originalSetAttribute = element.setAttribute.bind(element);
      element.setAttribute = function (name, value) {
        // Fix download attribute
        if (
          name === "download" &&
          typeof value === "string" &&
          value.includes("%25")
        ) {
          return originalSetAttribute(name, decodeDoubleEncodedThai(value));
        }
        return originalSetAttribute(name, value);
      };
    }

    return element;
  };

  console.log("Thai filename fix applied successfully");

  // Return the decode function for direct use if needed
  return {
    decodeThaiFilename: decodeDoubleEncodedThai,
  };
}

/**
 * Helper to fix a specific filename
 */
export function fixThaiFilename(encodedName) {
  if (!encodedName || typeof encodedName !== "string") return encodedName;

  // Handle double encoding (%25E0%25B8...)
  if (encodedName.includes("%25")) {
    try {
      // First decode once to get %E0%B8...
      const firstPass = decodeURIComponent(encodedName);

      // If result still has % characters, it was indeed double-encoded
      if (firstPass.includes("%")) {
        try {
          // Decode the second layer
          return decodeURIComponent(firstPass);
        } catch (e) {
          console.warn("Second decoding failed:", e);
          return firstPass; // Return the first-level decoded string
        }
      }
      return firstPass;
    } catch (e) {
      console.warn("First decoding failed:", e);
    }
  }

  // Handle regular encoded filenames (just encoded once)
  if (encodedName.includes("%")) {
    try {
      return decodeURIComponent(encodedName);
    } catch (e) {
      console.warn("Decoding failed:", e);
    }
  }

  // Return original if not encoded or decoding failed
  return encodedName;
}
