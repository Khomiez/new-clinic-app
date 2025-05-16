/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Boxmoji Clinical color palette
        "primary-light-blue": "#ebf5ff",
        "primary-medium-blue": "#dbeafe",
        "primary-dark-blue": "#93c5fd",
        "secondary-white": "#ffffff",
        "secondary-light-white": "#f9fafb",
        "accent-blue-start": "#60a5fa",
        "accent-blue-end": "#3b82f6",
        "text-deep-blue": "#1e40af",
        "text-medium-blue": "#3b82f6",
        "text-slate-blue": "#64748b",
      },
      fontFamily: {
        prompt: ["var(--font-prompt)", "Prompt", "sans-serif"],
        sans: ["var(--font-prompt)", "Prompt", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.1)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};