// Structure pour une valeur avec variantes Light et Dark
export interface ModeValue {
  light: string;
  dark: string;
}

// Structure pour une couleur avec ses 3 nuances (chaque nuance a light/dark)
export interface ColorWithNuances {
  nuance1: ModeValue;
  nuance2: ModeValue;
  nuance3: ModeValue;
}

// Structure complète des logos
export interface BrandingLogos {
  logo1: ModeValue; // Logo principal
  logo2: ModeValue; // Logo monochrome
  logo3: ModeValue; // Logo icône
  favicon: string | null; // Favicon (commun aux deux modes)
}

// Structure complète des couleurs
export interface BrandingColors {
  color2: ColorWithNuances; // Couleur 1 (Primary - boutons, icônes)
  color1: ColorWithNuances; // Couleur 2 (Secondary - titres)
  color3: ColorWithNuances; // Couleur 3 (Accent - spinners, loaders)
}

// Réponse complète de l'API branding
export interface CompleteBrandingResponse {
  logos: BrandingLogos;
  colors: BrandingColors;
  customCss: string | null;
  fontFamily: string | null;
  fontUrl: string | null;
  companyName?: string | null;
  companyCountry?: string | null;
}
