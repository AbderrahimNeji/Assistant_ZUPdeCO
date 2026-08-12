/**
 * Phone number formats and validation rules by country
 */

export interface PhoneFormat {
  country: string;
  countryCode: string;
  dialCode: string;
  format: string;
  regex: RegExp;
  minLength: number;
  maxLength: number;
  placeholder: string;
  example: string;
}

export const phoneFormats: Record<string, PhoneFormat> = {
  FR: {
    country: 'France',
    countryCode: 'FR',
    dialCode: '+33',
    format: 'XX XX XX XX XX',
    regex: /^0[1-9]\d{8}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '06 12 34 56 78',
    example: '06 12 34 56 78',
  },
  US: {
    country: 'United States',
    countryCode: 'US',
    dialCode: '+1',
    format: '(XXX) XXX-XXXX',
    regex: /^[2-9]\d{9}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '(555) 123-4567',
    example: '(555) 123-4567',
  },
  GB: {
    country: 'United Kingdom',
    countryCode: 'GB',
    dialCode: '+44',
    format: 'XXXX XXX XXXX',
    regex: /^[1-9]\d{9,10}$/,
    minLength: 10,
    maxLength: 11,
    placeholder: '7400 123456',
    example: '7400 123456',
  },
  DE: {
    country: 'Germany',
    countryCode: 'DE',
    dialCode: '+49',
    format: 'XXX XXXXXXXX',
    regex: /^[1-9]\d{9,11}$/,
    minLength: 10,
    maxLength: 12,
    placeholder: '151 12345678',
    example: '151 12345678',
  },
  ES: {
    country: 'Spain',
    countryCode: 'ES',
    dialCode: '+34',
    format: 'XXX XX XX XX',
    regex: /^[6-9]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '612 34 56 78',
    example: '612 34 56 78',
  },
  IT: {
    country: 'Italy',
    countryCode: 'IT',
    dialCode: '+39',
    format: 'XXX XXX XXXX',
    regex: /^3\d{8,9}$/,
    minLength: 9,
    maxLength: 10,
    placeholder: '312 345 6789',
    example: '312 345 6789',
  },
  BE: {
    country: 'Belgium',
    countryCode: 'BE',
    dialCode: '+32',
    format: 'XXX XX XX XX',
    regex: /^4\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '470 12 34 56',
    example: '470 12 34 56',
  },
  CH: {
    country: 'Switzerland',
    countryCode: 'CH',
    dialCode: '+41',
    format: 'XX XXX XX XX',
    regex: /^[1-9]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '78 123 45 67',
    example: '78 123 45 67',
  },
  CA: {
    country: 'Canada',
    countryCode: 'CA',
    dialCode: '+1',
    format: '(XXX) XXX-XXXX',
    regex: /^[2-9]\d{9}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '(555) 123-4567',
    example: '(555) 123-4567',
  },
  MA: {
    country: 'Morocco',
    countryCode: 'MA',
    dialCode: '+212',
    format: 'XXXX-XXXXXX',
    regex: /^[5-7]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '0612-345678',
    example: '0612-345678',
  },
  DZ: {
    country: 'Algeria',
    countryCode: 'DZ',
    dialCode: '+213',
    format: 'XXX XX XX XX',
    regex: /^[5-7]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '551 23 45 67',
    example: '551 23 45 67',
  },
  TN: {
    country: 'Tunisia',
    countryCode: 'TN',
    dialCode: '+216',
    format: 'XX XXX XXX',
    regex: /^[2-9]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '20 123 456',
    example: '20 123 456',
  },
  // Nouveaux pays francophones
  SN: {
    country: 'Senegal',
    countryCode: 'SN',
    dialCode: '+221',
    format: 'XX XXX XX XX',
    regex: /^[37]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '77 123 45 67',
    example: '77 123 45 67',
  },
  CI: {
    country: "Côte d'Ivoire",
    countryCode: 'CI',
    dialCode: '+225',
    format: 'XX XX XX XX XX',
    regex: /^[0257]\d{9}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '07 12 34 56 78',
    example: '07 12 34 56 78',
  },
  CM: {
    country: 'Cameroon',
    countryCode: 'CM',
    dialCode: '+237',
    format: 'X XX XX XX XX',
    regex: /^[26]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '6 71 23 45 67',
    example: '6 71 23 45 67',
  },
  ML: {
    country: 'Mali',
    countryCode: 'ML',
    dialCode: '+223',
    format: 'XX XX XX XX',
    regex: /^[67]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '70 12 34 56',
    example: '70 12 34 56',
  },
  BF: {
    country: 'Burkina Faso',
    countryCode: 'BF',
    dialCode: '+226',
    format: 'XX XX XX XX',
    regex: /^[67]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '70 12 34 56',
    example: '70 12 34 56',
  },
  NE: {
    country: 'Niger',
    countryCode: 'NE',
    dialCode: '+227',
    format: 'XX XX XX XX',
    regex: /^[9]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '90 12 34 56',
    example: '90 12 34 56',
  },
  TG: {
    country: 'Togo',
    countryCode: 'TG',
    dialCode: '+228',
    format: 'XX XX XX XX',
    regex: /^[9]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '90 12 34 56',
    example: '90 12 34 56',
  },
  BJ: {
    country: 'Benin',
    countryCode: 'BJ',
    dialCode: '+229',
    format: 'XX XX XX XX',
    regex: /^[9]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '90 12 34 56',
    example: '90 12 34 56',
  },
  MR: {
    country: 'Mauritania',
    countryCode: 'MR',
    dialCode: '+222',
    format: 'XX XX XX XX',
    regex: /^[234]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '22 12 34 56',
    example: '22 12 34 56',
  },
  GN: {
    country: 'Guinea',
    countryCode: 'GN',
    dialCode: '+224',
    format: 'XXX XX XX XX',
    regex: /^[6]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '601 12 34 56',
    example: '601 12 34 56',
  },
  CG: {
    country: 'Congo',
    countryCode: 'CG',
    dialCode: '+242',
    format: 'XX XXX XX XX',
    regex: /^0[1-9]\d{7}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '06 123 45 67',
    example: '06 123 45 67',
  },
  CD: {
    country: 'DR Congo',
    countryCode: 'CD',
    dialCode: '+243',
    format: 'XXX XXX XXX',
    regex: /^[89]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '812 345 678',
    example: '812 345 678',
  },
  GA: {
    country: 'Gabon',
    countryCode: 'GA',
    dialCode: '+241',
    format: 'XX XX XX XX',
    regex: /^0[1-7]\d{6}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '06 12 34 56',
    example: '06 12 34 56',
  },
  TD: {
    country: 'Chad',
    countryCode: 'TD',
    dialCode: '+235',
    format: 'XX XX XX XX',
    regex: /^[69]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '66 12 34 56',
    example: '66 12 34 56',
  },
  CF: {
    country: 'Central African Republic',
    countryCode: 'CF',
    dialCode: '+236',
    format: 'XX XX XX XX',
    regex: /^[7]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '70 12 34 56',
    example: '70 12 34 56',
  },
  MG: {
    country: 'Madagascar',
    countryCode: 'MG',
    dialCode: '+261',
    format: 'XX XX XXX XX',
    regex: /^0[3]\d{8}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '03 12 345 67',
    example: '03 12 345 67',
  },
  RW: {
    country: 'Rwanda',
    countryCode: 'RW',
    dialCode: '+250',
    format: 'XXX XXX XXX',
    regex: /^0[7]\d{8}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '072 123 456',
    example: '072 123 456',
  },
  BI: {
    country: 'Burundi',
    countryCode: 'BI',
    dialCode: '+257',
    format: 'XX XX XX XX',
    regex: /^[67]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '79 12 34 56',
    example: '79 12 34 56',
  },
  DJ: {
    country: 'Djibouti',
    countryCode: 'DJ',
    dialCode: '+253',
    format: 'XX XX XX XX',
    regex: /^[7]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '77 12 34 56',
    example: '77 12 34 56',
  },
  KM: {
    country: 'Comoros',
    countryCode: 'KM',
    dialCode: '+269',
    format: 'XXX XX XX',
    regex: /^[3]\d{6}$/,
    minLength: 7,
    maxLength: 7,
    placeholder: '321 23 45',
    example: '321 23 45',
  },
  HT: {
    country: 'Haiti',
    countryCode: 'HT',
    dialCode: '+509',
    format: 'XX XX XXXX',
    regex: /^[3-4]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '34 12 3456',
    example: '34 12 3456',
  },
  MQ: {
    country: 'Martinique',
    countryCode: 'MQ',
    dialCode: '+596',
    format: 'XXX XX XX XX',
    regex: /^0[6-7]\d{8}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '0696 12 34 56',
    example: '0696 12 34 56',
  },
  GP: {
    country: 'Guadeloupe',
    countryCode: 'GP',
    dialCode: '+590',
    format: 'XXX XX XX XX',
    regex: /^0[6-7]\d{8}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '0690 12 34 56',
    example: '0690 12 34 56',
  },
  GF: {
    country: 'French Guiana',
    countryCode: 'GF',
    dialCode: '+594',
    format: 'XXX XX XX XX',
    regex: /^0[6-7]\d{8}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '0694 12 34 56',
    example: '0694 12 34 56',
  },
  LU: {
    country: 'Luxembourg',
    countryCode: 'LU',
    dialCode: '+352',
    format: 'XXX XXX XXX',
    regex: /^[6]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    placeholder: '621 123 456',
    example: '621 123 456',
  },
  MC: {
    country: 'Monaco',
    countryCode: 'MC',
    dialCode: '+377',
    format: 'XX XX XX XX',
    regex: /^[46]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '06 12 34 56',
    example: '06 12 34 56',
  },
  RE: {
    country: 'Réunion',
    countryCode: 'RE',
    dialCode: '+262',
    format: 'XXX XX XX XX',
    regex: /^0[6-7]\d{8}$/,
    minLength: 10,
    maxLength: 10,
    placeholder: '0692 12 34 56',
    example: '0692 12 34 56',
  },
  NC: {
    country: 'New Caledonia',
    countryCode: 'NC',
    dialCode: '+687',
    format: 'XX XX XX',
    regex: /^[7-9]\d{5}$/,
    minLength: 6,
    maxLength: 6,
    placeholder: '75 12 34',
    example: '75 12 34',
  },
  PF: {
    country: 'French Polynesia',
    countryCode: 'PF',
    dialCode: '+689',
    format: 'XX XX XX XX',
    regex: /^[4-8]\d{7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '40 12 34 56',
    example: '40 12 34 56',
  },
  LB: {
    country: 'Lebanon',
    countryCode: 'LB',
    dialCode: '+961',
    format: 'XX XXX XXX',
    regex: /^0[3-9]\d{6,7}$/,
    minLength: 8,
    maxLength: 8,
    placeholder: '03 123 456',
    example: '03 123 456',
  },
};

/**
 * Get phone format configuration for a country code
 */
export const getPhoneFormat = (countryCode: string): PhoneFormat | undefined => {
  return phoneFormats[countryCode];
};

/**
 * Validate phone number against country-specific rules
 */
export const validatePhoneByCountry = (phone: string, countryCode: string): boolean => {
  const format = getPhoneFormat(countryCode);
  if (!format) return false;

  const digitsOnly = phone.replaceAll(/\D/g, '');

  // Check length
  if (digitsOnly.length < format.minLength || digitsOnly.length > format.maxLength) {
    return false;
  }

  // Check regex pattern
  return format.regex.test(digitsOnly);
};

// Format: XX XX XX XX XX (10 digits)
const formatFrenchPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

// Format: X XX XX XX XX (9 digits)
const formatNineDigitPhone = (digits: string): string => {
  if (digits.length <= 1) return digits;
  if (digits.length <= 3) return `${digits[0]} ${digits.slice(1)}`;
  if (digits.length <= 5) return `${digits[0]} ${digits.slice(1, 3)} ${digits.slice(3)}`;
  if (digits.length <= 7)
    return `${digits[0]} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  return `${digits[0]} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
};

// Format: (XXX) XXX-XXXX
const formatNorthAmericanPhone = (digits: string): string => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

// Format: XXXX XXX XXXX
const formatBritishPhone = (digits: string): string => {
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
};

// Format: XXX XXXXXXXX
const formatGermanPhone = (digits: string): string => {
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 11)}`;
};

// Format: XXX XXX XXXX
const formatItalianPhone = (digits: string): string => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
};

// Format: XX XXX XX XX
const formatSwissPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
};

// Format: XXXX-XXXXXX
const formatMoroccanPhone = (digits: string): string => {
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4, 10)}`;
};

// Format: XX XXX XXX
const formatTunisianPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
};

// Format: XX XX XX XX (8 digits) - Senegal, Mali, BF, NE, TG, BJ, MR, TD, CF, BI, DJ, PF, MC
const formatEightDigitPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
};

// Format: XX XX XX XX XX (10 digits) - CI, MG, RW, MQ, GP, GF, RE
const formatTenDigitPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

// Format: XXX XX XX XX (9 digits) - GN
const formatGuineaPhone = (digits: string): string => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
};

// Format: XX XXX XX XX (9 digits) - CG
const formatCongoPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
};

// Format: XXX XXX XXX (9 digits) - CD, LU
const formatThreeBlocksPhone = (digits: string): string => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
};

// Format: XX XX XX (6 digits) - NC
const formatNewCaledoniaPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)}`;
};

// Format: XXX XX XX (7 digits) - KM
const formatComorosPhone = (digits: string): string => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)}`;
};

// Format: XX XX XXXX (8 digits) - HT
const formatHaitiPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)}`;
};

// Format: XX XXX XXX (8 digits) - LB
const formatLebanonPhone = (digits: string): string => {
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)}`;
};

/**
 * Format phone number according to country-specific format
 */
export const formatPhoneByCountry = (phone: string, countryCode: string): string => {
  const format = getPhoneFormat(countryCode);
  if (!format) return phone;

  const digitsOnly = phone.replaceAll(/\D/g, '');

  switch (countryCode) {
    case 'FR':
      return formatFrenchPhone(digitsOnly);
    case 'ES':
    case 'BE':
    case 'DZ':
      return formatNineDigitPhone(digitsOnly);
    case 'US':
    case 'CA':
      return formatNorthAmericanPhone(digitsOnly);
    case 'GB':
      return formatBritishPhone(digitsOnly);
    case 'DE':
      return formatGermanPhone(digitsOnly);
    case 'IT':
      return formatItalianPhone(digitsOnly);
    case 'CH':
      return formatSwissPhone(digitsOnly);
    case 'MA':
      return formatMoroccanPhone(digitsOnly);
    case 'TN':
      return formatTunisianPhone(digitsOnly);
    // Nouveaux pays francophones
    case 'SN':
    case 'ML':
    case 'BF':
    case 'NE':
    case 'TG':
    case 'BJ':
    case 'MR':
    case 'TD':
    case 'CF':
    case 'BI':
    case 'DJ':
    case 'PF':
    case 'MC':
    case 'GA':
      return formatEightDigitPhone(digitsOnly);
    case 'CI':
    case 'MG':
    case 'RW':
    case 'MQ':
    case 'GP':
    case 'GF':
    case 'RE':
      return formatTenDigitPhone(digitsOnly);
    case 'CM':
      return formatNineDigitPhone(digitsOnly);
    case 'GN':
      return formatGuineaPhone(digitsOnly);
    case 'CG':
      return formatCongoPhone(digitsOnly);
    case 'CD':
    case 'LU':
      return formatThreeBlocksPhone(digitsOnly);
    case 'NC':
      return formatNewCaledoniaPhone(digitsOnly);
    case 'KM':
      return formatComorosPhone(digitsOnly);
    case 'HT':
      return formatHaitiPhone(digitsOnly);
    case 'LB':
      return formatLebanonPhone(digitsOnly);
    default:
      return phone;
  }
};

/**
 * Normalize international phone prefix to local format.
 * E.g. for FR: "+33612..." or "0033612..." → "0612..."
 */
export const normalizePhoneToLocal = (digits: string, countryCode: string): string => {
  if (countryCode === 'FR') {
    if (digits.startsWith('0033')) {
      return '0' + digits.slice(4);
    }
    // Cas 33 + 11 chiffres : supprimer le "33", ajouter le "0" local
    if (digits.startsWith('33') && digits.length >= 11) {
      return '0' + digits.slice(2);
    }
  }
  return digits;
};

/**
 * Get validation state for phone input
 */
export const getPhoneValidationState = (
  phone: string,
  countryCode: string,
): 'default' | 'success' | 'error' => {
  if (!phone || phone.trim().length === 0) return 'default';

  const digitsOnly = phone.replaceAll(/\D/g, '');
  const format = getPhoneFormat(countryCode);

  if (!format) return 'default';

  // If user is still typing (less than min length), show default
  if (digitsOnly.length < format.minLength) return 'default';

  // If valid, show success
  if (validatePhoneByCountry(phone, countryCode)) return 'success';

  // If too long or invalid pattern, show error
  return 'error';
};
