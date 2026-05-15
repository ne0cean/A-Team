/**
 * A-Team Design Tokens — Tailwind CSS variant
 *
 * 사용법 (tailwind.config.js):
 *   const tokens = require('./design-tokens/tailwind-tokens');
 *   module.exports = { theme: { extend: tokens('dark-app') } };
 *
 * 또는 프리셋 없이 직접:
 *   module.exports = { theme: { extend: tokens() } };
 */

const presets = require('./presets.json');

module.exports = function tokens(preset = 'light-dashboard') {
  const p = presets[preset] || presets['light-dashboard'];

  return {
    colors: {
      bg: { primary: p.BG_PRIMARY, secondary: p.BG_SECONDARY, surface: p.BG_SURFACE },
      text: { primary: p.TEXT_PRIMARY, secondary: p.TEXT_SECONDARY, muted: p.TEXT_MUTED },
      accent: { DEFAULT: p.ACCENT, hover: p.ACCENT_HOVER, subtle: p.ACCENT_SUBTLE },
      border: { subtle: p.BORDER_SUBTLE, hover: p.BORDER_HOVER },
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    spacing: {
      '2xs': '2px', xs: '4px', sm: '8px', md: '16px',
      lg: '24px', xl: '32px', '2xl': '48px', '3xl': '64px',
    },
    borderRadius: {
      sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px',
    },
    boxShadow: {
      sm: '0 1px 3px rgba(0,0,0,0.12)',
      md: '0 4px 12px rgba(0,0,0,0.15)',
      lg: '0 8px 24px rgba(0,0,0,0.20)',
      glow: `0 0 20px ${p.ACCENT_GLOW}`,
    },
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem', sm: '0.875rem', base: '1rem',
      lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '2rem',
    },
    transitionDuration: { fast: '150ms', base: '250ms', slow: '400ms' },
    zIndex: { base: '0', dropdown: '100', sticky: '200', overlay: '300', modal: '400', toast: '500' },
  };
};
