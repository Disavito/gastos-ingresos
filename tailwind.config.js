/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF', // White background
        surface: '#F9FAFB',   // Light grey for card surfaces
        text: '#1F2937',      // Dark text for readability
        textSecondary: '#6B7280', // Secondary text
        border: '#E5E7EB',    // Light border
        primary: '#3B82F6',   // Vibrant Blue (for main actions/focus)
        accent: '#22C55E',    // Vibrant Green (for highlights/income)
        success: '#22C55E',   // Green for success (same as accent)
        error: '#EF4444',     // Red for errors/expenses
        warning: '#F59E0B',   // Orange for warnings
      },
      borderRadius: {
        'xl': '16px', // Custom rounded corners
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Using Inter as a modern sans-serif
      },
    },
  },
  plugins: [],
}
