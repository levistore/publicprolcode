/** @type {import('tailwindcss').Config} */
/* Theme: "ClassHub Light Orbit" — adaptasi gaya StenlyPay.
   Light monokrom: bg off-white, teks near-black, aksen utama HITAM,
   pill buttons, radius kecil, shadow minimal. */
const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#f7f7f8',      // halaman (persis Stenly)
          elevated: '#ffffff',     // kartu / panel naik
          panel: '#ffffff',        // panel = putih bersih
          inset: '#f1f1f3',        // input / inset track
          hover: '#ededf0',        // hover halus
        },
        text: {
          DEFAULT: '#1a1a1a',      // near-black (Stenly)
          secondary: '#52525b',    // zinc-600
          muted: '#71717a',        // zinc-500
        },
        line: {
          DEFAULT: '#e4e4e7',      // zinc-200 — border tipis
          strong: '#111111',       // border tegas ala Stenly
        },
        ink: '#111111',            // "hitam sebagai aksen" — tombol primer
        accent: {
          DEFAULT: '#111111',      // aksen utama = hitam
          soft: 'rgba(17,17,17,0.06)',
          border: '#d4d4d8',
          hover: '#2a2a2a',
        },
        success: { DEFAULT: '#16a34a', soft: 'rgba(22,163,74,0.10)' },
        warning: { DEFAULT: '#ca8a04', soft: 'rgba(202,138,4,0.12)' },
        danger: { DEFAULT: '#dc2626', soft: 'rgba(220,38,38,0.09)' },
        info: '#2563eb',           // biru fungsional kecil (deadline/link)
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'Geist', 'system-ui', 'sans-serif'],
        display: ['var(--font-geist)', 'Geist', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '18px',
        xl: '22px',
        pill: '9999px',
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
