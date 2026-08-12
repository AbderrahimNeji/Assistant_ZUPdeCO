/**
 * Converts a branding color token to a CSS custom property.
 *
 * @param color - Color value from database (e.g. 'color-primary-500', '#FF0000', 'red')
 * @returns CSS-ready value (e.g. 'var(--color-primary-500)', '#FF0000', 'red')
 *
 * @example
 * resolveBrandingColor('color-primary-500') // → 'var(--color-primary-500)'
 * resolveBrandingColor('#7C3AED') // → '#7C3AED'
 * resolveBrandingColor('red') // → 'red'
 */
export function resolveBrandingColor(color: string | null | undefined): string | undefined {
  if (!color) return undefined;

  // If color starts with 'color-', convert to CSS custom property
  if (color.startsWith('color-')) {
    return `var(--${color})`;
  }

  // Otherwise return as-is (hex, named colors, etc.)
  return color;
}
