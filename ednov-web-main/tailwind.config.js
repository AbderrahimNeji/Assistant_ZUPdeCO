/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    // Dynamic grid columns for DynamicLayout
    'grid-cols-1',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'md:grid-cols-1',
    'md:grid-cols-2',
    'md:grid-cols-3',
    'md:grid-cols-4',
    'lg:grid-cols-1',
    'lg:grid-cols-2',
    'lg:grid-cols-3',
    'lg:grid-cols-4',
    'xl:grid-cols-1',
    'xl:grid-cols-2',
    'xl:grid-cols-3',
    'xl:grid-cols-4',
    // Dynamic column spans
    'col-span-1',
    'col-span-2',
    'col-span-3',
    'col-span-4',
    'md:col-span-1',
    'md:col-span-2',
    'md:col-span-3',
    'md:col-span-4',
    'lg:col-span-1',
    'lg:col-span-2',
    'lg:col-span-3',
    'lg:col-span-4',
    'xl:col-span-1',
    'xl:col-span-2',
    'xl:col-span-3',
    'xl:col-span-4',
    // Dynamic gaps
    'gap-2',
    'gap-4',
    'gap-6',
    'gap-8',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Couleur 1 (Primary) - Boutons, icônes principales, menus
        primary: {
          DEFAULT: 'var(--color-2-nuance-1)', // Icônes, texte principal
          hover: 'var(--color-2-nuance-2)', // Hover états
          bg: 'var(--color-2-nuance-3)', // Backgrounds, encadrés
          foreground: 'hsl(var(--primary-foreground))',
        },
        // Couleur 2 (Secondary) - Titres, borders colorés
        secondary: {
          DEFAULT: 'var(--color-1-nuance-1)', // Titres
          hover: 'var(--color-1-nuance-2)', // Borders colorés
          light: 'var(--color-1-nuance-3)', // Spinners (legacy)
          foreground: 'hsl(var(--secondary-foreground))',
        },
        // Couleur 3 (Accent) - Spinners, loaders, éléments tertiaires
        accent: {
          DEFAULT: 'var(--color-3-nuance-1)', // Spinners, loaders
          hover: 'var(--color-3-nuance-2)', // Hover spinners
          light: 'var(--color-3-nuance-3)', // Light variant
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        postit: {
          jaune: 'rgb(var(--postit-jaune))',
          orange: 'rgb(var(--postit-orange))',
          rose: 'rgb(var(--postit-rose))',
          vert: 'rgb(var(--postit-vert))',
          bleu: 'rgb(var(--postit-bleu))',
          violet: 'rgb(var(--postit-violet))',
          turquoise: 'rgb(var(--postit-turquoise))',
          rouge: 'rgb(var(--postit-rouge))',
          'jaune-button': 'rgb(var(--postit-jaune-button))',
          'jaune-placeholder': 'rgb(var(--postit-jaune-placeholder))',
          'jaune-text': 'rgb(var(--postit-jaune-text))',
          'orange-button': 'rgb(var(--postit-orange-button))',
          'orange-placeholder': 'rgb(var(--postit-orange-placeholder))',
          'orange-text': 'rgb(var(--postit-orange-text))',
          'rose-button': 'rgb(var(--postit-rose-button))',
          'rose-placeholder': 'rgb(var(--postit-rose-placeholder))',
          'rose-text': 'rgb(var(--postit-rose-text))',
          'vert-button': 'rgb(var(--postit-vert-button))',
          'vert-placeholder': 'rgb(var(--postit-vert-placeholder))',
          'vert-text': 'rgb(var(--postit-vert-text))',
          'bleu-button': 'rgb(var(--postit-bleu-button))',
          'bleu-placeholder': 'rgb(var(--postit-bleu-placeholder))',
          'bleu-text': 'rgb(var(--postit-bleu-text))',
          'violet-button': 'rgb(var(--postit-violet-button))',
          'violet-placeholder': 'rgb(var(--postit-violet-placeholder))',
          'violet-text': 'rgb(var(--postit-violet-text))',
          'turquoise-button': 'rgb(var(--postit-turquoise-button))',
          'turquoise-placeholder': 'rgb(var(--postit-turquoise-placeholder))',
          'turquoise-text': 'rgb(var(--postit-turquoise-text))',
          'rouge-button': 'rgb(var(--postit-rouge-button))',
          'rouge-placeholder': 'rgb(var(--postit-rouge-placeholder))',
          'rouge-text': 'rgb(var(--postit-rouge-text))',
          'blanc-casse': 'rgb(var(--postit-blanc-casse))',
          'blanc-casse-button': 'rgb(var(--postit-blanc-casse-button))',
          'blanc-casse-placeholder': 'rgb(var(--postit-blanc-casse-placeholder))',
          'blanc-casse-text': 'rgb(var(--postit-blanc-casse-text))',
        },
        // Semantic colors
        success: {
          DEFAULT: 'rgb(10, 134, 66)',
          light: 'rgb(var(--color-success) / 0.1)',
        },
        error: {
          DEFAULT: 'rgb(var(--color-error))',
          light: 'rgb(var(--color-error) / 0.1)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning))',
          light: 'rgb(var(--color-warning) / 0.1)',
        },
        info: {
          DEFAULT: 'rgb(var(--color-info))',
          light: 'rgb(var(--color-info) / 0.1)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        postit:
          '0 4px 6px rgb(var(--foreground-rgb) / 0.1), 0 2px 4px rgb(var(--foreground-rgb) / 0.06)',
        'postit-hover':
          '0 10px 15px rgb(var(--foreground-rgb) / 0.15), 0 4px 6px rgb(var(--foreground-rgb) / 0.1)',
        'postit-3d': 'inset 0 -2px 4px rgb(var(--foreground-rgb) / 0.1)',
      },
      rotate: {
        1: '1deg',
        2: '2deg',
        '-1': '-1deg',
        '-2': '-2deg',
      },
      fontFamily: {
        caveat: ['Caveat', 'cursive'],
      },
      keyframes: {
        'modal-in': {
          from: {
            opacity: '0',
            transform: 'scale(0.95) translateY(-10px)',
          },
          to: {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
          },
        },
        'modal-out': {
          from: {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
          },
          to: {
            opacity: '0',
            transform: 'scale(0.95) translateY(-10px)',
          },
        },
      },
      animation: {
        'modal-in': 'modal-in 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'modal-out': 'modal-out 300ms cubic-bezier(0.4, 0, 1, 1)',
      },
    },
  },
  plugins: [],
};
