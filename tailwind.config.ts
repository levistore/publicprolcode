/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#101216',
          elevated: '#16181d',
          panel: '#1a1d23',
          inset: '#12141a',
          hover: '#21252c',
        },
        text: {
          DEFAULT: '#f2f3f5',
          secondary: '#a7adb8',
          muted: '#6f7681',
        },
        line: {
          DEFAULT: '#262a31',
          strong: '#343a43',
        },
        accent: {
          DEFAULT: '#4d8dff',
          soft: 'rgba(77,141,255,0.14)',
          border: 'rgba(77,141,255,0.35)',
          hover: '#3f7ff0',
        },
        success: { DEFAULT: '#4ea87a', soft: 'rgba(78,168,122,0.14)' },
        warning: { DEFAULT: '#d0a34a', soft: 'rgba(208,163,74,0.14)' },
        danger: { DEFAULT: '#d4645c', soft: 'rgba(212,100,92,0.14)' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
      },
      keyframes: {
        pageIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        modalIn: {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
        sheetIn: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        pageIn: 'pageIn 0.22s ease both',
        fadeIn: 'fadeIn 0.14s ease both',
        modalIn: 'modalIn 0.18s cubic-bezier(0.2,0.8,0.3,1) both',
        sheetIn: 'sheetIn 0.2s cubic-bezier(0.2,0.8,0.3,1) both',
        shimmer: 'shimmer 1.3s infinite linear',
        toastIn: 'toastIn 0.18s ease both',
      },
    },
  },
  plugins: [],
};

export default config;
