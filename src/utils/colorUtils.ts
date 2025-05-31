// src/utils/colorUtils.ts

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Generate lighter version of a color for background use
 */
export function lightenColor(hex: string, amount: number = 0.9): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;

  // Blend with white based on amount (0 = original, 1 = white)
  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);

  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB)
    .toString(16)
    .slice(1)}`;
}

/**
 * Determine if a color is light or dark (for text contrast)
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;

  // Calculate luminance
  const { r, g, b } = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
}

/**
 * Get contrasting text color (black or white) for a background color
 */
export function getContrastTextColor(hex: string): string {
  return isLightColor(hex) ? "#000000" : "#FFFFFF";
}

/**
 * Generate CSS custom properties for a clinic color theme
 */
export function generateClinicColorTheme(baseColor: string) {
  const lightBg = lightenColor(baseColor, 0.95); // Very light for backgrounds
  const mediumBg = lightenColor(baseColor, 0.85); // Medium light for cards
  const borderColor = lightenColor(baseColor, 0.7); // For borders
  const textColor = getContrastTextColor(lightBg);

  return {
    primary: baseColor,
    primaryLight: lightBg,
    primaryMedium: mediumBg,
    border: borderColor,
    text: textColor,
    textContrast: getContrastTextColor(baseColor),
  };
}

/**
 * Apply clinic color as CSS variables to document root
 */
export function applyClinicColorTheme(baseColor: string) {
  if (typeof window === "undefined") return;

  const theme = generateClinicColorTheme(baseColor);
  const root = document.documentElement;

  root.style.setProperty("--clinic-primary", theme.primary);
  root.style.setProperty("--clinic-primary-light", theme.primaryLight);
  root.style.setProperty("--clinic-primary-medium", theme.primaryMedium);
  root.style.setProperty("--clinic-border", theme.border);
  root.style.setProperty("--clinic-text", theme.text);
  root.style.setProperty("--clinic-text-contrast", theme.textContrast);
}

/**
 * Generate Tailwind-compatible color classes
 */
export function generateTailwindColorClasses(baseColor: string) {
  const theme = generateClinicColorTheme(baseColor);

  return {
    background: `bg-[${theme.primaryLight}]`,
    backgroundMedium: `bg-[${theme.primaryMedium}]`,
    border: `border-[${theme.border}]`,
    text: `text-[${theme.primary}]`,
    textContrast: `text-[${theme.textContrast}]`,
    button: `bg-[${theme.primary}] text-[${theme.textContrast}]`,
    buttonHover: `hover:bg-[${theme.primary}] hover:text-[${theme.textContrast}]`,
  };
}
