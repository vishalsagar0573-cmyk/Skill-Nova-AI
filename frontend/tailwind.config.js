/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Theme Tokens (mapped to CSS variables)
        'app-bg': 'var(--color-app-bg)',
        'card-bg': 'var(--color-card-bg)',
        'sidebar-bg': 'var(--color-sidebar-bg)',
        'border-subtle': 'var(--color-border)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        secondary: 'var(--color-secondary)',
        'text-main': 'var(--color-text-main)',
        'text-secondary': 'var(--color-text-secondary)',
        'input-bg': 'var(--color-input-bg)',
        'input-border': 'var(--color-input-border)',

        // Preserved legacy constants for backward compatibility
        'ai-accent': "#7965FF",
        'ai-secondary': "#9B8AFF",
        'career-success': "#42CFA5",
        'status-warning': "#F5B94C",
        'status-danger': "#F16C83",
        'app-secondary': "#0D1224",
        'glass-card': "#141A30",
        dark: "#0D1224",
        darker: "#080B18",
        light: "#F5F6FF",
      },
      boxShadow: {
        'theme-card': 'var(--color-card-shadow)',
        'theme-hover': '0 12px 30px -4px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}
