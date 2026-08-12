import { formatPhoneByCountry, phoneFormats } from './phone-formats';
import { isValidEmail } from './validation';

/**
 * Converts a locally-formatted phone number to E.164 format required by Firebase.
 *
 * Handles all the ways French (and other) users can write their number:
 * - "06 12 34 56 78"   → "+33612345678"  (local format with trunk 0)
 * - "6 12 34 56 78"    → "+33612345678"  (no trunk, e.g. after stripping +33 dial code)
 * - "+33612345678"     → "+33612345678"  (already E.164, just strip spaces)
 * - "0612345678"       → "+33612345678"  (compact local format)
 *
 * @param localPhone - The phone value as stored in form state (local display format)
 * @param isoCode    - ISO country code (e.g. 'FR', 'TN', 'MA')
 */
export function phoneToE164(localPhone: string, isoCode: string = 'FR'): string {
  if (!localPhone?.trim()) return localPhone;

  const trimmed = localPhone.trim();

  // Already E.164 — just strip any stray spaces/formatting
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replaceAll(/\D/g, '');
  }

  const format = phoneFormats[isoCode];
  const dialCode = format?.dialCode ?? '+33'; // e.g. "+33"

  const digitsOnly = trimmed.replaceAll(/\D/g, '');

  // Trunk prefix present (e.g. leading "0" for FR, GB, BE…) → remove it
  if (digitsOnly.startsWith('0')) {
    return dialCode + digitsOnly.slice(1);
  }

  // No trunk prefix (e.g. "612345678" after stripping the dial code in SmartContactInput)
  return dialCode + digitsOnly;
}

/**
 * Mapping from country full names (FR/EN, case-insensitive) to ISO codes.
 * Used to convert companies.country ("France", "Tunisia", etc.) to ISO codes for phone formatting.
 */
export const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  // Europe
  france: 'FR',
  'united states': 'US',
  'états-unis': 'US',
  'united kingdom': 'GB',
  'royaume-uni': 'GB',
  germany: 'DE',
  allemagne: 'DE',
  spain: 'ES',
  espagne: 'ES',
  italy: 'IT',
  italie: 'IT',
  belgium: 'BE',
  belgique: 'BE',
  switzerland: 'CH',
  suisse: 'CH',
  luxembourg: 'LU',
  monaco: 'MC',
  // North America
  canada: 'CA',
  // North Africa
  morocco: 'MA',
  maroc: 'MA',
  algeria: 'DZ',
  algérie: 'DZ',
  tunisia: 'TN',
  tunisie: 'TN',
  // Sub-Saharan Africa (Francophone)
  senegal: 'SN',
  sénégal: 'SN',
  'ivory coast': 'CI',
  "côte d'ivoire": 'CI',
  cameroon: 'CM',
  cameroun: 'CM',
  mali: 'ML',
  'burkina faso': 'BF',
  niger: 'NE',
  togo: 'TG',
  benin: 'BJ',
  bénin: 'BJ',
  mauritania: 'MR',
  mauritanie: 'MR',
  guinea: 'GN',
  guinée: 'GN',
  'republic of the congo': 'CG',
  'république du congo': 'CG',
  congo: 'CG',
  'democratic republic of the congo': 'CD',
  'république démocratique du congo': 'CD',
  gabon: 'GA',
  chad: 'TD',
  tchad: 'TD',
  'central african republic': 'CF',
  'république centrafricaine': 'CF',
  madagascar: 'MG',
  rwanda: 'RW',
  burundi: 'BI',
  djibouti: 'DJ',
  comoros: 'KM',
  comores: 'KM',
  // Caribbean / Americas
  haiti: 'HT',
  haïti: 'HT',
  martinique: 'MQ',
  guadeloupe: 'GP',
  'french guiana': 'GF',
  guyane: 'GF',
  // Indian Ocean / Pacific
  réunion: 'RE',
  reunion: 'RE',
  'new caledonia': 'NC',
  'nouvelle-calédonie': 'NC',
  'french polynesia': 'PF',
  'polynésie française': 'PF',
  // Middle East
  lebanon: 'LB',
  liban: 'LB',
};

/**
 * Converts a country full name (e.g. "France", "Tunisia") to ISO code (e.g. "FR", "TN").
 * Returns null if not found or empty.
 */
export function countryNameToIso(name: string | null | undefined): string | null {
  if (!name) return null;
  return COUNTRY_NAME_TO_ISO[name.toLowerCase().trim()] ?? null;
}

/**
 * Mapping des indicatifs téléphoniques vers les codes ISO pays.
 * Triés du plus long au plus court pour éviter l'ambiguïté (ex: +1 vs +212).
 */
export const COUNTRY_CODE_MAP: Record<string, string> = {
  '216': 'TN', // Tunisie
  '213': 'DZ', // Algérie
  '212': 'MA', // Maroc
  '44': 'GB', // Royaume-Uni
  '49': 'DE', // Allemagne
  '41': 'CH', // Suisse
  '39': 'IT', // Italie
  '34': 'ES', // Espagne
  '33': 'FR', // France
  '32': 'BE', // Belgique
  '1': 'US', // USA/Canada
  // Nouveaux pays francophones
  '221': 'SN', // Sénégal
  '225': 'CI', // Côte d'Ivoire
  '237': 'CM', // Cameroun
  '223': 'ML', // Mali
  '226': 'BF', // Burkina Faso
  '227': 'NE', // Niger
  '228': 'TG', // Togo
  '229': 'BJ', // Bénin
  '222': 'MR', // Mauritanie
  '224': 'GN', // Guinée
  '242': 'CG', // Congo
  '243': 'CD', // RD Congo
  '241': 'GA', // Gabon
  '235': 'TD', // Tchad
  '236': 'CF', // Centrafrique
  '261': 'MG', // Madagascar
  '250': 'RW', // Rwanda
  '257': 'BI', // Burundi
  '253': 'DJ', // Djibouti
  '269': 'KM', // Comores
  '509': 'HT', // Haïti
  '596': 'MQ', // Martinique
  '590': 'GP', // Guadeloupe
  '594': 'GF', // Guyane
  '352': 'LU', // Luxembourg
  '377': 'MC', // Monaco
  '262': 'RE', // Réunion
  '687': 'NC', // Nouvelle-Calédonie
  '689': 'PF', // Polynésie française
  '961': 'LB', // Liban
};

/**
 * Préfixe trunk local par pays (le chiffre à ajouter devant un numéro significatif).
 * Ex: FR = "0", donc significant "612345678" → local "0612345678"
 */
const TRUNK_PREFIX: Record<string, string> = {
  FR: '0',
  GB: '0',
  BE: '0',
  DE: '0',
  IT: '0',
  ES: '0',
  CH: '0',
  MA: '0',
  TN: '0',
  DZ: '0',
  US: '',
  CA: '',
  // Nouveaux pays francophones
  SN: '0',
  CI: '0',
  CM: '0',
  ML: '0',
  BF: '0',
  NE: '0',
  TG: '0',
  BJ: '0',
  MR: '0',
  GN: '0',
  CG: '0',
  CD: '0',
  GA: '0',
  TD: '0',
  CF: '0',
  MG: '0',
  RW: '0',
  BI: '0',
  DJ: '0',
  KM: '0',
  HT: '',
  MQ: '0',
  GP: '0',
  GF: '0',
  LU: '0',
  MC: '0',
  RE: '0',
  NC: '0',
  PF: '',
  LB: '0',
};

/**
 * Détecte l'indicatif pays dans un numéro au format E.164 ou international.
 * Retourne { dialCode: string, isoCode: string } ou null si non trouvé.
 */
function detectCountryFromE164(digits: string): { dialCode: string; isoCode: string } | null {
  // Trier les indicatifs du plus long au plus court pour éviter les ambiguïtés
  const sortedDialCodes = Object.keys(COUNTRY_CODE_MAP).sort((a, b) => b.length - a.length);

  for (const dialCode of sortedDialCodes) {
    if (digits.startsWith(dialCode)) {
      return { dialCode, isoCode: COUNTRY_CODE_MAP[dialCode] };
    }
  }

  return null;
}

/**
 * Convertit un numéro téléphonique stocké (E.164, international ou local) vers le format d'affichage local.
 *
 * @param raw - Numéro brut depuis la DB (ex: "+33612345678", "33612345678", "06 12 34 56 78")
 * @param defaultCountry - Code ISO pays par défaut si non détecté (défaut: 'FR')
 * @returns { displayValue, isoCode } - Valeur formatée pour affichage + code pays ISO
 *
 * @example
 * parseStoredPhone("+33612345678") → { displayValue: "06 12 34 56 78", isoCode: "FR" }
 * parseStoredPhone("06 12 34 56 78") → { displayValue: "06 12 34 56 78", isoCode: "FR" }
 * parseStoredPhone("+21612345678") → { displayValue: "12 345 678", isoCode: "TN" }
 */
export function parseStoredPhone(
  raw: string,
  defaultCountry: string = 'FR',
): { displayValue: string; isoCode: string } {
  if (!raw || !raw.trim()) {
    return { displayValue: '', isoCode: defaultCountry };
  }

  // Supprimer tous les non-chiffres sauf le + initial
  let cleaned = raw.trim();
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replaceAll(/\D/g, '');
  } else {
    cleaned = cleaned.replaceAll(/\D/g, '');
  }

  let isoCode = defaultCountry;
  let localDigits = cleaned;

  // Si commence par +, détecter le pays
  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.slice(1); // Enlever le +
    const detected = detectCountryFromE164(digitsOnly);

    if (detected) {
      isoCode = detected.isoCode;
      const significantDigits = digitsOnly.slice(detected.dialCode.length);
      const trunk = TRUNK_PREFIX[isoCode] || '';
      localDigits = trunk + significantDigits;
    } else {
      // Indicatif non reconnu, garder tel quel
      localDigits = digitsOnly;
    }
  }
  // Si commence par un indicatif sans +, détecter aussi
  else if (cleaned.length > 10) {
    const detected = detectCountryFromE164(cleaned);
    if (detected) {
      isoCode = detected.isoCode;
      const significantDigits = cleaned.slice(detected.dialCode.length);
      const trunk = TRUNK_PREFIX[isoCode] || '';
      localDigits = trunk + significantDigits;
    }
  }
  // Sinon, c'est déjà un numéro local, utiliser le pays par défaut

  // Formater selon le pays
  const displayValue = formatPhoneByCountry(localDigits, isoCode);

  return { displayValue, isoCode };
}

/**
 * Détermine le mode (email ou phone), la valeur d'affichage et le code pays
 * depuis les valeurs brutes stockées en DB (email et/ou phone).
 *
 * Utilisé pour pré-peupler les formulaires d'édition.
 *
 * @param email - Email stocké (peut être null)
 * @param phone - Téléphone stocké (peut être null)
 * @returns { mode, displayValue, isoCode }
 *
 * @example
 * resolveStoredContact("jean@example.com", null)
 *   → { mode: 'email', displayValue: 'jean@example.com', isoCode: 'FR' }
 *
 * resolveStoredContact(null, "+33612345678")
 *   → { mode: 'phone', displayValue: '06 12 34 56 78', isoCode: 'FR' }
 *
 * resolveStoredContact("jean@example.com", "+33612345678")
 *   → { mode: 'email', displayValue: 'jean@example.com', isoCode: 'FR' }
 *   (priorité à l'email si les deux sont présents)
 */
export function resolveStoredContact(
  email: string | null,
  phone: string | null,
): { mode: 'email' | 'phone'; displayValue: string; isoCode: string } {
  // Priorité à l'email si présent et valide
  if (email && isValidEmail(email)) {
    return {
      mode: 'email',
      displayValue: email.trim(),
      isoCode: 'FR', // Par défaut, pas utilisé pour email
    };
  }

  // Sinon téléphone
  if (phone && phone.trim()) {
    const parsed = parseStoredPhone(phone);
    return {
      mode: 'phone',
      displayValue: parsed.displayValue,
      isoCode: parsed.isoCode,
    };
  }

  // Fallback si rien n'est fourni
  return {
    mode: 'email',
    displayValue: '',
    isoCode: 'FR',
  };
}
