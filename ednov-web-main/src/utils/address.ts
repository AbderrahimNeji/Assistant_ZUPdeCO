import { getDepartmentByPostalCode } from '@/data/departments';

export interface AddressInfo {
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  department?: string;
}

/**
 * Extrait les informations d'adresse à partir d'un label complet
 * Format attendu: "12 rue de la République, 75001 Paris"
 *
 * @param fullAddress - Label complet de l'adresse
 * @returns Objet contenant les informations extraites
 */
export function extractAddressInfo(fullAddress: string): AddressInfo {
  if (!fullAddress?.trim()) {
    return {};
  }

  const result: AddressInfo = {
    addressLine1: fullAddress.trim(),
  };

  const postalCodePattern = /\b(\d{5})\b/;
  const postalCodeMatch = postalCodePattern.exec(fullAddress);

  if (postalCodeMatch) {
    result.postalCode = postalCodeMatch[1];

    const parts = fullAddress.split(',').map((p) => p.trim());

    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];

      const cityMatch = /^\d{5}\s+(.+)$/.exec(lastPart);
      if (cityMatch) {
        result.city = cityMatch[1].trim();
      } else {
        const postalCodeIndex = lastPart.indexOf(result.postalCode);
        if (postalCodeIndex !== -1) {
          const cityPart = lastPart.substring(postalCodeIndex + 5).trim();
          if (cityPart) {
            result.city = cityPart;
          }
        }
      }

      result.addressLine1 = parts.slice(0, -1).join(', ').trim();
    }
  }

  return result;
}

/**
 * Détermine le département à partir d'un code postal
 *
 * @param postalCode - Code postal (5 chiffres)
 * @returns Nom du département ou null si non trouvé
 */
export function getDepartmentFromPostalCode(postalCode: string): string | null {
  if (!postalCode || postalCode.length < 2) {
    return null;
  }

  const department = getDepartmentByPostalCode(postalCode);
  return department ? department.name : null;
}
