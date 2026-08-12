import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BrandingLogos, BrandingColors, CompleteBrandingResponse } from '@/types/branding.types';

interface ThemeStore {
  isDarkMode: boolean;
  logos: BrandingLogos;
  colors: BrandingColors;
  customCss: string | null;
  fontFamily: string | null;
  fontUrl: string | null;
  companyName: string | null;
  companyCountry: string | null;
  setDarkMode: (_isDark: boolean) => void;
  setBranding: (_branding: CompleteBrandingResponse) => void;
  applyTheme: () => void;
}

const defaultColors: BrandingColors = {
  color2: {
    nuance1: { light: '#2C5282', dark: '#3D6BA8' },
    nuance2: { light: '#1E3A5F', dark: '#2C5282' },
    nuance3: { light: '#1A2F4A', dark: '#1E3A5F' },
  },
  color1: {
    nuance1: { light: '#FF8C42', dark: '#FF7020' },
    nuance2: { light: '#FF6B2E', dark: '#E65A1A' },
    nuance3: { light: '#E65A1A', dark: '#CC3F00' },
  },
  color3: {
    nuance1: { light: '#2DD4BF', dark: '#5EEAD4' },
    nuance2: { light: '#14B8A6', dark: '#2DD4BF' },
    nuance3: { light: '#0F766E', dark: '#14B8A6' },
  },
};

const endThemeSwitch = (root: HTMLElement) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('theme-no-transition'));
  });
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      isDarkMode: false,
      logos: {
        logo1: { light: '', dark: '' },
        logo2: { light: '', dark: '' },
        logo3: { light: '', dark: '' },
        favicon: null,
      },
      colors: defaultColors,
      customCss: null,
      fontFamily: null,
      fontUrl: null,
      companyName: null,
      companyCountry: null,

      setDarkMode: (isDark: boolean) => {
        set({ isDarkMode: isDark });
        get().applyTheme();
      },

      setBranding: (branding: CompleteBrandingResponse) => {
        set({
          logos: branding.logos,
          colors: {
            color2: {
              nuance1: {
                light: branding.colors.color2.nuance1.light || defaultColors.color2.nuance1.light,
                dark: branding.colors.color2.nuance1.dark || defaultColors.color2.nuance1.dark,
              },
              nuance2: {
                light: branding.colors.color2.nuance2.light || defaultColors.color2.nuance2.light,
                dark: branding.colors.color2.nuance2.dark || defaultColors.color2.nuance2.dark,
              },
              nuance3: {
                light: branding.colors.color2.nuance3.light || defaultColors.color2.nuance3.light,
                dark: branding.colors.color2.nuance3.dark || defaultColors.color2.nuance3.dark,
              },
            },
            color1: {
              nuance1: {
                light: branding.colors.color1.nuance1.light || defaultColors.color1.nuance1.light,
                dark: branding.colors.color1.nuance1.dark || defaultColors.color1.nuance1.dark,
              },
              nuance2: {
                light: branding.colors.color1.nuance2.light || defaultColors.color1.nuance2.light,
                dark: branding.colors.color1.nuance2.dark || defaultColors.color1.nuance2.dark,
              },
              nuance3: {
                light: branding.colors.color1.nuance3.light || defaultColors.color1.nuance3.light,
                dark: branding.colors.color1.nuance3.dark || defaultColors.color1.nuance3.dark,
              },
            },
            color3: {
              nuance1: {
                light: branding.colors.color3.nuance1.light || defaultColors.color3.nuance1.light,
                dark: branding.colors.color3.nuance1.dark || defaultColors.color3.nuance1.dark,
              },
              nuance2: {
                light: branding.colors.color3.nuance2.light || defaultColors.color3.nuance2.light,
                dark: branding.colors.color3.nuance2.dark || defaultColors.color3.nuance2.dark,
              },
              nuance3: {
                light: branding.colors.color3.nuance3.light || defaultColors.color3.nuance3.light,
                dark: branding.colors.color3.nuance3.dark || defaultColors.color3.nuance3.dark,
              },
            },
          },
          customCss: branding.customCss,
          fontFamily: branding.fontFamily,
          fontUrl: branding.fontUrl,
          companyName: branding.companyName ?? null,
          companyCountry: branding.companyCountry ?? null,
        });
        get().applyTheme();
      },

      applyTheme: () => {
        const root = document.documentElement;
        root.classList.add('theme-no-transition');
        root.getBoundingClientRect();

        try {
          const { isDarkMode, colors, customCss, fontFamily, fontUrl } = get();
          const mode = isDarkMode ? 'dark' : 'light';

          // Couleur 1 (Primary - boutons, icônes principales, menus)
          // Nuance 1: Icônes, texte principal
          // Nuance 2: Hover états
          // Nuance 3: Backgrounds, encadrés
          root.style.setProperty('--color-2-nuance-1', colors.color2.nuance1[mode]);
          root.style.setProperty('--color-2-nuance-2', colors.color2.nuance2[mode]);
          root.style.setProperty('--color-2-nuance-3', colors.color2.nuance3[mode]);

          // Couleur 2 (Secondary - titres, borders colorés)
          // Nuance 1: Titres
          // Nuance 2: Borders colorés
          // Nuance 3: Variante claire
          root.style.setProperty('--color-1-nuance-1', colors.color1.nuance1[mode]);
          root.style.setProperty('--color-1-nuance-2', colors.color1.nuance2[mode]);
          root.style.setProperty('--color-1-nuance-3', colors.color1.nuance3[mode]);

          // Couleur 3 (Accent - spinners, loaders)
          // Nuance 1: Spinners, loaders
          // Nuance 2: Hover spinners
          // Nuance 3: Variante claire
          root.style.setProperty('--color-3-nuance-1', colors.color3.nuance1[mode]);
          root.style.setProperty('--color-3-nuance-2', colors.color3.nuance2[mode]);
          root.style.setProperty('--color-3-nuance-3', colors.color3.nuance3[mode]);

          // Toggle dark class
          root.classList.toggle('dark', isDarkMode);

          // Apply favicon dynamically
          const { logos: brandingLogos } = get();
          if (brandingLogos.favicon) {
            let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (!favicon) {
              favicon = document.createElement('link');
              favicon.rel = 'icon';
              document.head.appendChild(favicon);
            }
            favicon.href = brandingLogos.favicon;
          }

          // Apply custom font
          if (fontFamily) {
            root.style.setProperty('--font-family', fontFamily);
          }

          // Load custom font URL
          if (fontUrl) {
            const linkId = 'custom-font-link';
            let link = document.getElementById(linkId) as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.id = linkId;
              link.rel = 'stylesheet';
              document.head.appendChild(link);
            }
            link.href = fontUrl;
          }

          // Apply custom CSS
          if (customCss) {
            const styleId = 'custom-branding-css';
            let style = document.getElementById(styleId);
            if (!style) {
              style = document.createElement('style');
              style.id = styleId;
              document.head.appendChild(style);
            }
            style.textContent = customCss;
          }
        } finally {
          endThemeSwitch(root);
        }
      },
    }),
    {
      name: 'ednov-theme',
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        logos: state.logos,
        colors: state.colors,
      }),
    },
  ),
);
