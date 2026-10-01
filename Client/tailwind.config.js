/** Theme colour from a CSS variable that still supports `/60`-style opacity modifiers. */
const themed =
  (name) =>
  ({ opacityValue } = {}) =>
    opacityValue === undefined || opacityValue === '1'
      ? `var(${name})`
      : `color-mix(in srgb, var(${name}) calc(${opacityValue} * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Legacy *-opacity-* utilities would wrap every theme colour in color-mix()
  corePlugins: {
    backgroundOpacity: false,
    textOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    placeholderOpacity: false,
    ringOpacity: false,
  },
  theme: {
    extend: {
      colors: {
        prime: {
          // --prime-fg flips in dark; --prime-night stays brand-dark for bands
          ink: themed('--prime-fg'),
          night: themed('--prime-night'),
          charcoal: themed('--prime-charcoal'),
          gold: themed('--prime-gold'),
          'gold-soft': themed('--prime-gold-soft'),
          'gold-deep': themed('--prime-gold-deep'),
          muted: themed('--prime-muted'),
          line: themed('--prime-line'),
          sand: themed('--prime-sand'),
          mist: themed('--prime-mist'),
          dune: themed('--prime-dune'),
          surface: themed('--prime-surface'),
          white: themed('--prime-white'),
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Kufi Arabic"', 'Georgia', 'serif'],
        sans: ['"Jost Variable"', 'Jost', '"Noto Kufi Arabic"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        prime: '1360px',
      },
      // Viewport heights divided by the large-screen zoom (see index.css)
      minHeight: {
        screen: 'calc(100vh / var(--ui-zoom, 1))',
        'vh-100': 'calc(100svh / var(--ui-zoom, 1))',
        'vh-72': 'calc(72svh / var(--ui-zoom, 1))',
        'vh-78': 'calc(78svh / var(--ui-zoom, 1))',
      },
      height: {
        'dvh-100': 'calc(100dvh / var(--ui-zoom, 1))',
        'dvh-modal': 'min(54rem, calc(100dvh / var(--ui-zoom, 1) - 3rem))',
      },
      maxHeight: {
        'dvh-90': 'calc(90dvh / var(--ui-zoom, 1))',
      },
      letterSpacing: {
        brand: '0.32em',
        premium: '0.2em',
      },
      fontSize: {
        'display-2xl': [
          'clamp(2.9rem, 8.2vw, 7.25rem)',
          { lineHeight: '0.95', letterSpacing: '-0.02em', fontWeight: '500' },
        ],
        'display-xl': [
          'clamp(2.5rem, 6vw, 5rem)',
          { lineHeight: '1', letterSpacing: '-0.018em', fontWeight: '500' },
        ],
        'display-lg': [
          'clamp(2.15rem, 4.3vw, 3.65rem)',
          { lineHeight: '1.04', letterSpacing: '-0.015em', fontWeight: '500' },
        ],
        'display-md': [
          'clamp(1.65rem, 2.6vw, 2.3rem)',
          { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '500' },
        ],
      },
      boxShadow: {
        premium: '0 24px 60px rgba(34, 31, 32, 0.08)',
        'premium-lg': '0 32px 80px rgba(34, 31, 32, 0.14)',
      },
      transitionTimingFunction: {
        prime: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
