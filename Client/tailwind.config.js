/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        prime: {
          // --prime-fg flips in dark; --prime-night stays brand-dark for bands
          ink: 'var(--prime-fg)',
          night: 'var(--prime-night)',
          charcoal: 'var(--prime-charcoal)',
          gold: 'var(--prime-gold)',
          'gold-soft': 'var(--prime-gold-soft)',
          'gold-deep': 'var(--prime-gold-deep)',
          muted: 'var(--prime-muted)',
          line: 'var(--prime-line)',
          sand: 'var(--prime-sand)',
          mist: 'var(--prime-mist)',
          surface: 'var(--prime-surface)',
          white: 'var(--prime-white)',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        prime: '1320px',
      },
      letterSpacing: {
        brand: '0.28em',
        premium: '0.18em',
      },
      fontSize: {
        'display-xl': [
          'clamp(2.75rem, 7.5vw, 5.4rem)',
          { lineHeight: '0.96', letterSpacing: '-0.04em', fontWeight: '800' },
        ],
        'display-lg': [
          'clamp(2rem, 4.4vw, 3.25rem)',
          { lineHeight: '1.04', letterSpacing: '-0.032em', fontWeight: '700' },
        ],
      },
      boxShadow: {
        premium: '0 24px 60px rgba(34, 31, 32, 0.1)',
        'premium-lg': '0 32px 80px rgba(34, 31, 32, 0.16)',
      },
    },
  },
  plugins: [],
};
