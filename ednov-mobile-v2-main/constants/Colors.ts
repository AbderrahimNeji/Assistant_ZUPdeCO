/**
 * Design token colors for light/dark themes.
 * Values must match tailwind.config.js theme.extend.colors (and dark.*) so that
 * Tailwind className and this file stay in sync. Single source of truth: tailwind.config.js.
 */
export default {
  light: {
    text: '#000000',
    textSecondary: '#666666',
    background: '#ffffff',
    backgroundSecondary: '#f8f8f8',
    backgroundCalendar: '#fafafa',
    pageBackground: '#FFF8F6',
    tint: '#FF6B43',
    tabIconDefault: '#cccccc',
    tabIconSelected: '#FF6B43',
    border: '#ebebeb',
    /** Card/surface border (slightly stronger than border in dark). */
    subtleBorder: '#e0e0e0',
    /** Shadow color for elevation (tab bar, cards). */
    shadow: '#000000',
    separator: '#eeeeee',
    success: '#14cc70',
    warning: '#ffc700',
    danger: '#ff0022',
    info: '#49bcd8',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    background: '#000000',
    backgroundSecondary: '#1a1a1a',
    backgroundCalendar: '#242424',
    pageBackground: '#0d0806',
    tint: '#FF6B43',
    tabIconDefault: '#cccccc',
    tabIconSelected: '#FF6B43',
    border: 'rgba(255,255,255,0.1)',
    /** Card/surface border (slightly more visible in dark). */
    subtleBorder: 'rgba(255,255,255,0.28)',
    /** Shadow color for elevation. */
    shadow: '#000000',
    separator: 'rgba(255,255,255,0.1)',
    success: '#14cc70',
    warning: '#ffc700',
    danger: '#ff0022',
    info: '#49bcd8',
  },
} as const;
