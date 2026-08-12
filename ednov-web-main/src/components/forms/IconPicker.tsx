import * as React from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X, Check } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';
import '@/styles/icon-picker.css';

// Récupérer toutes les icônes Lucide (exclure les non-composants)
const ALL_LUCIDE_ICONS = Object.keys(LucideIcons)
  .filter((key) => {
    // Ne garder que les icônes (composants React qui commencent par une majuscule)
    // Exclure : createLucideIcon (factory), icons (namespace), Icon (composant générique
    // sans iconNode baked-in → crash si rendu sans prop iconNode)
    return /^[A-Z]/.test(key) && key !== 'createLucideIcon' && key !== 'icons' && key !== 'Icon';
  })
  .sort();

export interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export interface DynamicIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Rendu dynamique d'une icône Lucide par nom.
 * Si l'icône n'existe pas, rendu d'un Circle par défaut.
 */
export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className, style }) => {
  const Icon = (LucideIcons as Record<string, unknown>)[name] as
    | React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    | undefined;

  if (!Icon) {
    // Fallback silencieux : Circle
    return <LucideIcons.Circle className={className} style={style} />;
  }

  return <Icon className={className} style={style} />;
};

/**
 * IconPicker complet :
 * - Toutes les icônes Lucide (~1500+)
 * - Recherche rapide
 * - Popover/Dropdown avec grille virtualisée
 * - Aperçu de l'icône sélectionnée
 */
export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fermer le dropdown en cliquant à l'extérieur
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-focus sur l'input quand le dropdown s'ouvre
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filtrer les icônes selon la recherche
  const filteredIcons = React.useMemo(() => {
    if (!search.trim()) return ALL_LUCIDE_ICONS;
    const q = search.toLowerCase();
    return ALL_LUCIDE_ICONS.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const handleSelectIcon = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={cn('icon-picker-wrapper', className)}>
      {/* Bouton trigger */}
      <button
        ref={buttonRef}
        type="button"
        className="icon-picker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Sélectionner une icône"
      >
        {value ? (
          <div className="flex items-center gap-2">
            <DynamicIcon name={value} className="w-5 h-5" />
            <span className="text-sm">{value}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="w-5 h-5" />
            <span className="text-sm">Choisir une icône...</span>
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div ref={dropdownRef} className="icon-picker-dropdown">
          {/* Barre de recherche */}
          <div className="icon-picker-search">
            <div className="icon-picker-search-field">
              <Search className="icon-picker-search-icon" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher une icône..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="icon-picker-search-input"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="icon-picker-search-clear"
                  aria-label="Effacer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="text-xs text-muted-foreground px-3 py-1">
              {filteredIcons.length} icône{filteredIcons.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Grille d'icônes avec virtualization simple via CSS */}
          <div className="icon-picker-grid-container">
            {filteredIcons.length > 0 ? (
              <div className="icon-picker-grid">
                {filteredIcons.map((iconName) => {
                  const isSelected = iconName === value;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={cn('icon-picker-item', {
                        'icon-picker-item--selected': isSelected,
                      })}
                      onClick={() => handleSelectIcon(iconName)}
                      title={iconName}
                      aria-label={iconName}
                    >
                      <DynamicIcon name={iconName} className="icon-picker-item-icon" />
                      {isSelected && <Check className="icon-picker-item-check" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="icon-picker-empty">
                <Search className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Aucune icône trouvée</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="icon-picker-footer">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                setSearch('');
              }}
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
