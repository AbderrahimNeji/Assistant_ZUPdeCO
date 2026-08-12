import { PostItColor, PostItThematic } from '@/types/post-it.types';

// ─── Couleurs ────────────────────────────────────────────────────────────────

export const COLOR_MAP: Record<string, string> = {
  jaune: 'bg-postit-jaune',
  orange: 'bg-postit-orange',
  rose: 'bg-postit-rose',
  vert: 'bg-postit-vert',
  bleu: 'bg-postit-bleu',
  violet: 'bg-postit-violet',
  turquoise: 'bg-postit-turquoise',
  'blanc-casse': 'bg-postit-blanc-casse',
};

export const BUTTON_COLOR_MAP: Record<string, string> = {
  jaune: 'text-postit-jaune-button hover:text-postit-jaune-button/80',
  orange: 'text-postit-orange-button hover:text-postit-orange-button/80',
  rose: 'text-postit-rose-button hover:text-postit-rose-button/80',
  vert: 'text-postit-vert-button hover:text-postit-vert-button/80',
  bleu: 'text-postit-bleu-button hover:text-postit-bleu-button/80',
  violet: 'text-postit-violet-button hover:text-postit-violet-button/80',
  turquoise: 'text-postit-turquoise-button hover:text-postit-turquoise-button/80',
  rouge: 'text-postit-rouge-button hover:text-postit-rouge-button/80',
  'blanc-casse': 'text-postit-blanc-casse-button hover:text-postit-blanc-casse-button/80',
};

// Couleur de base uniquement (sans variant hover) — pour les icônes de la carte
export const ICON_COLOR_MAP: Record<string, string> = {
  jaune: 'text-postit-jaune-button',
  orange: 'text-postit-orange-button',
  rose: 'text-postit-rose-button',
  vert: 'text-postit-vert-button',
  bleu: 'text-postit-bleu-button',
  violet: 'text-postit-violet-button',
  turquoise: 'text-postit-turquoise-button',
  rouge: 'text-postit-rouge-button',
  'blanc-casse': 'text-postit-blanc-casse-button',
};

export const TEXT_COLOR_MAP: Record<string, string> = {
  jaune: 'text-postit-jaune-text',
  orange: 'text-postit-orange-text',
  rose: 'text-postit-rose-text',
  vert: 'text-postit-vert-text',
  bleu: 'text-postit-bleu-text',
  violet: 'text-postit-violet-text',
  turquoise: 'text-postit-turquoise-text',
  rouge: 'text-postit-rouge-text',
  'blanc-casse': 'text-postit-blanc-casse-text',
};

export const BORDER_COLOR_MAP: Record<string, string> = {
  jaune: 'border-postit-jaune-placeholder/30',
  orange: 'border-postit-orange-placeholder/30',
  rose: 'border-postit-rose-placeholder/30',
  vert: 'border-postit-vert-placeholder/30',
  bleu: 'border-postit-bleu-placeholder/30',
  violet: 'border-postit-violet-placeholder/30',
  turquoise: 'border-postit-turquoise-placeholder/30',
  rouge: 'border-postit-rouge-placeholder/30',
  'blanc-casse': 'border-postit-blanc-casse-text',
};

export const FOOTER_BORDER_COLOR_MAP: Record<string, string> = {
  jaune: 'border-postit-jaune-button/30',
  orange: 'border-postit-orange-button/30',
  rose: 'border-postit-rose-button/30',
  vert: 'border-postit-vert-button/30',
  bleu: 'border-postit-bleu-button/30',
  violet: 'border-postit-violet-button/30',
  turquoise: 'border-postit-turquoise-button/30',
  rouge: 'border-postit-rouge-button/30',
  'blanc-casse': 'border-postit-blanc-casse-text',
};

// Schedule chip styles (active/inactive)
export const SCHEDULE_CHIP_ACTIVE_BG_MAP: Record<string, string> = {
  jaune: 'bg-postit-jaune-button',
  orange: 'bg-postit-orange-button',
  rose: 'bg-postit-rose-button',
  vert: 'bg-postit-vert-button',
  bleu: 'bg-postit-bleu-button',
  violet: 'bg-postit-violet-button',
  turquoise: 'bg-postit-turquoise-button',
  rouge: 'bg-postit-rouge-button',
  'blanc-casse': 'bg-postit-blanc-casse-button',
};

export const SCHEDULE_CHIP_ACTIVE_TEXT_MAP: Record<string, string> = {
  jaune: 'text-postit-jaune',
  orange: 'text-postit-orange',
  rose: 'text-postit-rose',
  vert: 'text-postit-vert',
  bleu: 'text-postit-bleu',
  violet: 'text-postit-violet',
  turquoise: 'text-postit-turquoise',
  rouge: 'text-postit-rouge',
  'blanc-casse': 'text-postit-blanc-casse',
};

export const SCHEDULE_CHIP_ACTIVE_BORDER_MAP: Record<string, string> = {
  jaune: 'border-postit-jaune-button',
  orange: 'border-postit-orange-button',
  rose: 'border-postit-rose-button',
  vert: 'border-postit-vert-button',
  bleu: 'border-postit-bleu-button',
  violet: 'border-postit-violet-button',
  turquoise: 'border-postit-turquoise-button',
  rouge: 'border-postit-rouge-button',
  'blanc-casse': 'border-postit-blanc-casse-button',
};

export const SCHEDULE_CHIP_INACTIVE_TEXT_MAP: Record<string, string> = {
  jaune: 'text-postit-jaune-button',
  orange: 'text-postit-orange-button',
  rose: 'text-postit-rose-button',
  vert: 'text-postit-vert-button',
  bleu: 'text-postit-bleu-button',
  violet: 'text-postit-violet-button',
  turquoise: 'text-postit-turquoise-button',
  rouge: 'text-postit-rouge-button',
  'blanc-casse': 'text-postit-blanc-casse-button',
};

export const SCHEDULE_CHIP_INACTIVE_BORDER_MAP: Record<string, string> = {
  jaune: 'border-postit-jaune-button/30',
  orange: 'border-postit-orange-button/30',
  rose: 'border-postit-rose-button/30',
  vert: 'border-postit-vert-button/30',
  bleu: 'border-postit-bleu-button/30',
  violet: 'border-postit-violet-button/30',
  turquoise: 'border-postit-turquoise-button/30',
  rouge: 'border-postit-rouge-button/30',
  'blanc-casse': 'border-postit-blanc-casse-button/30',
};

/**
 * Helper function to get schedule chip classes based on post-it color and selection state
 * Active: fond accent (bg-postit-{color}-button), texte couleur post-it (text-postit-{color})
 * Inactive: fond transparent, texte accent (text-postit-{color}-button)
 */
export function getScheduleChipClasses(color: PostItColor, selected: boolean): string {
  if (selected) {
    return `${SCHEDULE_CHIP_ACTIVE_BG_MAP[color]} ${SCHEDULE_CHIP_ACTIVE_TEXT_MAP[color]} ${SCHEDULE_CHIP_ACTIVE_BORDER_MAP[color]} font-semibold`;
  }
  return `bg-transparent hover:bg-white/10 ${SCHEDULE_CHIP_INACTIVE_TEXT_MAP[color]} ${SCHEDULE_CHIP_INACTIVE_BORDER_MAP[color]}`;
}

export const COLOR_MAP_MODAL: Record<
  PostItColor,
  { bg: string; hoverBg: string; text: string; border: string }
> = {
  jaune: {
    bg: 'bg-postit-jaune',
    hoverBg: 'hover:bg-postit-jaune',
    text: 'text-amber-900',
    border: 'border-amber-700',
  },
  orange: {
    bg: 'bg-postit-orange',
    hoverBg: 'hover:bg-postit-orange',
    text: 'text-orange-900',
    border: 'border-orange-400',
  },
  rose: {
    bg: 'bg-postit-rose',
    hoverBg: 'hover:bg-postit-rose',
    text: 'text-pink-900',
    border: 'border-pink-400',
  },
  vert: {
    bg: 'bg-postit-vert',
    hoverBg: 'hover:bg-postit-vert',
    text: 'text-green-900',
    border: 'border-green-500',
  },
  violet: {
    bg: 'bg-postit-violet',
    hoverBg: 'hover:bg-postit-violet',
    text: 'text-purple-900',
    border: 'border-purple-400',
  },
  bleu: {
    bg: 'bg-postit-bleu',
    hoverBg: 'hover:bg-postit-bleu',
    text: 'text-blue-900',
    border: 'border-blue-400',
  },
  turquoise: {
    bg: 'bg-postit-turquoise',
    hoverBg: 'hover:bg-postit-turquoise',
    text: 'text-teal-900',
    border: 'border-teal-400',
  },
  'blanc-casse': {
    bg: 'bg-postit-blanc-casse',
    hoverBg: 'hover:bg-postit-blanc-casse',
    text: 'text-postit-blanc-casse-text',
    border: 'border-postit-blanc-casse-button',
  },
};

export const COLORS: PostItColor[] = [
  'jaune',
  'orange',
  'rose',
  'vert',
  'violet',
  'bleu',
  'turquoise',
];

// ─── Thématiques ─────────────────────────────────────────────────────────────

export const THEMATIC_ICONS: Record<string, string> = {
  seances: '📚',
  matching: '🤝',
  tuteur: '👨‍🏫',
  eleves: '🎓',
  etablissements: '🏫',
  administration: '📋',
  formation: '🏋️',
  rapport_activite: '📊',
  autres: '📌',
};

export const THEMATICS: { value: PostItThematic; label: string; emoji: string }[] = [
  { value: 'seances', label: 'Séances', emoji: '📚' },
  { value: 'matching', label: 'Matching', emoji: '🤝' },
  { value: 'tuteur', label: 'Tuteur', emoji: '👨‍🏫' },
  { value: 'eleves', label: 'Élèves', emoji: '🎓' },
  { value: 'etablissements', label: 'Établissements', emoji: '🏫' },
  { value: 'administration', label: 'Administration', emoji: '📋' },
  { value: 'formation', label: 'Formation', emoji: '🏋️' },
  { value: 'rapport_activite', label: "Rapport d'activité", emoji: '📊' },
  { value: 'autres', label: 'Autres', emoji: '📌' },
];
