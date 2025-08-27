/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx-tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // User's provided palette
        primary: '#9E7FFF', // Light purple
        secondary: '#38bdf8', // Light blue
        accent: '#f472b6', // Pink
        background: '#171717', // Very dark grey (overall page background, though we'll use a gradient)
        surface: '#262626', // Dark grey (form card background)
        text: '#FFFFFF', // White (main text on dark surfaces)
        textSecondary: '#A3A3A3', // Light grey (secondary text, labels)
        border: '#2F2F2F', // Darker grey (borders)
        success: '#10b981', // Green
        warning: '#f59e0b', // Orange
        error: '#ef4444', // Red

        // New color for dark text on white inputs for better contrast
        'input-text-dark': '#1F2937', // Dark text for white input fields
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
