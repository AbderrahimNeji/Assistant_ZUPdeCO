import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/styles/color-picker.css';

// Tokens du branding (3 nuances × 3 couleurs = 9)
const BRANDING_COLORS: Array<{ label: string; value: string; cssVar: string }> = [
  { label: 'Principal 1', value: 'color-1-nuance-1', cssVar: 'var(--color-1-nuance-1)' },
  { label: 'Principal 2', value: 'color-1-nuance-2', cssVar: 'var(--color-1-nuance-2)' },
  { label: 'Principal 3', value: 'color-1-nuance-3', cssVar: 'var(--color-1-nuance-3)' },
  { label: 'Secondaire 1', value: 'color-2-nuance-1', cssVar: 'var(--color-2-nuance-1)' },
  { label: 'Secondaire 2', value: 'color-2-nuance-2', cssVar: 'var(--color-2-nuance-2)' },
  { label: 'Secondaire 3', value: 'color-2-nuance-3', cssVar: 'var(--color-2-nuance-3)' },
  { label: 'Tertiaire 1', value: 'color-3-nuance-1', cssVar: 'var(--color-3-nuance-1)' },
  { label: 'Tertiaire 2', value: 'color-3-nuance-2', cssVar: 'var(--color-3-nuance-2)' },
  { label: 'Tertiaire 3', value: 'color-3-nuance-3', cssVar: 'var(--color-3-nuance-3)' },
];

// Palette de couleurs vives — valeurs hex stockées directement
const PALETTE_COLORS: Array<{ label: string; value: string }> = [
  // Rouges
  { label: 'Rouge clair', value: '#FCA5A5' },
  { label: 'Rouge', value: '#EF4444' },
  { label: 'Rouge vif', value: '#DC2626' },
  { label: 'Cramoisi', value: '#991B1B' },
  // Roses / Framboises
  { label: 'Rose pâle', value: '#FDA4AF' },
  { label: 'Rose vif', value: '#F43F5E' },
  { label: 'Framboise', value: '#E11D48' },
  { label: 'Rose', value: '#EC4899' },
  { label: 'Rose foncé', value: '#BE185D' },
  // Fuchsia / Violet
  { label: 'Fuchsia', value: '#D946EF' },
  { label: 'Violet clair', value: '#C084FC' },
  { label: 'Violet', value: '#A855F7' },
  { label: 'Violet foncé', value: '#7E22CE' },
  // Indigo / Bleu
  { label: 'Indigo clair', value: '#A5B4FC' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Indigo foncé', value: '#4338CA' },
  { label: 'Bleu clair', value: '#93C5FD' },
  { label: 'Bleu', value: '#3B82F6' },
  { label: 'Bleu vif', value: '#2563EB' },
  { label: 'Bleu foncé', value: '#1D4ED8' },
  { label: 'Marine', value: '#1E3A8A' },
  // Ciel / Cyan
  { label: 'Ciel clair', value: '#7DD3FC' },
  { label: 'Ciel', value: '#0EA5E9' },
  { label: 'Cyan clair', value: '#67E8F9' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Cyan foncé', value: '#0E7490' },
  // Teal / Émeraude
  { label: 'Teal clair', value: '#5EEAD4' },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Teal foncé', value: '#0F766E' },
  { label: 'Émeraude clair', value: '#6EE7B7' },
  { label: 'Émeraude', value: '#10B981' },
  { label: 'Émeraude foncé', value: '#065F46' },
  // Verts
  { label: 'Vert clair', value: '#86EFAC' },
  { label: 'Vert', value: '#22C55E' },
  { label: 'Vert vif', value: '#16A34A' },
  { label: 'Vert foncé', value: '#14532D' },
  { label: 'Lime', value: '#84CC16' },
  { label: 'Lime foncé', value: '#4D7C0F' },
  // Jaune / Ambre
  { label: 'Jaune', value: '#FDE047' },
  { label: 'Jaune vif', value: '#EAB308' },
  { label: 'Ambre', value: '#F59E0B' },
  { label: 'Ambre foncé', value: '#B45309' },
  // Oranges
  { label: 'Orange clair', value: '#FDB97D' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Orange vif', value: '#EA580C' },
  { label: 'Corail', value: '#FF6B6B' },
  { label: 'Terre cuite', value: '#C2410C' },
  // Marrons / Neutres chauds
  { label: 'Brun clair', value: '#D97706' },
  { label: 'Brun', value: '#92400E' },
  { label: 'Sable', value: '#D4A574' },
  { label: 'Taupe', value: '#A78B72' },
  // Gris / Ardoise
  { label: 'Gris clair', value: '#CBD5E1' },
  { label: 'Ardoise', value: '#64748B' },
  { label: 'Ardoise foncé', value: '#334155' },
  { label: 'Charbon', value: '#1E293B' },
  { label: 'Nuit', value: '#0F172A' },
];

export interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Résout un token de couleur vers sa valeur CSS.
 * 'color-1-nuance-1' → 'var(--color-1-nuance-1)'
 * '#EF4444'          → '#EF4444'
 */
export const resolveColor = (token: string): string => {
  const branding = BRANDING_COLORS.find((c) => c.value === token);
  if (branding) return branding.cssVar;
  return token;
};

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className }) => {
  const allColors = [
    ...BRANDING_COLORS.map((c) => ({ label: c.label, value: c.value, css: c.cssVar })),
    ...PALETTE_COLORS.map((c) => ({ label: c.label, value: c.value, css: c.value })),
  ];

  const selectedLabel = allColors.find((c) => c.value === value)?.label ?? value;

  return (
    <div className={cn('color-picker', className)}>
      {/* Section Branding */}
      <div className="color-picker-section">
        <h4 className="color-picker-section-title">Branding</h4>
        <div className="color-picker-grid">
          {BRANDING_COLORS.map((color) => {
            const isSelected = value === color.value;
            return (
              <button
                key={color.value}
                type="button"
                className={cn('color-picker-swatch', {
                  'color-picker-swatch--selected': isSelected,
                })}
                style={{ backgroundColor: color.cssVar }}
                onClick={() => onChange(color.value)}
                title={color.label}
                aria-label={color.label}
              >
                {isSelected && <Check className="color-picker-swatch-check" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Palette */}
      <div className="color-picker-section">
        <h4 className="color-picker-section-title">Palette</h4>
        <div className="color-picker-grid">
          {PALETTE_COLORS.map((color) => {
            const isSelected = value === color.value;
            return (
              <button
                key={color.value}
                type="button"
                className={cn('color-picker-swatch', {
                  'color-picker-swatch--selected': isSelected,
                })}
                style={{ backgroundColor: color.value }}
                onClick={() => onChange(color.value)}
                title={color.label}
                aria-label={color.label}
              >
                {isSelected && <Check className="color-picker-swatch-check" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aperçu */}
      {value && (
        <div className="color-picker-preview">
          <div
            className="color-picker-preview-swatch"
            style={{ backgroundColor: resolveColor(value) }}
          />
          <span className="color-picker-preview-label">{selectedLabel}</span>
        </div>
      )}
    </div>
  );
};
