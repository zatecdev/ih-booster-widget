/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.svelte",  // Look for .svelte files
    "./**/*.html" // Look for .html files
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
  future: {
    purgeLayersByDefault: true,
    removeDeprecatedGapUtilities: true,
  },
}

