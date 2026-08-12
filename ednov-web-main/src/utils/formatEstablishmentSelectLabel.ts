import type { Establishment } from '@/types/establishment.types';

/** INSEE-style dept code from French postal (5 digits). DOM/TOM: first 3 digits; Corse: 2A / 2B. */
function frenchDepartmentCodeFromPostal(postalCode: string | null | undefined): string | null {
  if (!postalCode) return null;
  const digits = postalCode.replace(/\s/g, '');
  if (!/^\d{5}$/.test(digits)) return null;
  const n = Number.parseInt(digits, 10);
  const d2 = digits.slice(0, 2);
  if (d2 === '97' || d2 === '98') return digits.slice(0, 3);
  if (d2 === '20') {
    if (n >= 20000 && n <= 20199) return '2A';
    if (n >= 20200 && n <= 20999) return '2B';
    return '20';
  }
  return d2;
}

function looksLikeFrenchDeptCode(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{2,3}$/.test(t)) return t;
  if (/^2[AB]$/i.test(t)) return t.toUpperCase();
  return null;
}

function resolveDepartmentCodeForLabel(e: Establishment): string | null {
  const country = e.country?.toUpperCase() ?? 'FR';
  if (country === 'FR') {
    const fromPostal = frenchDepartmentCodeFromPostal(e.postalCode);
    if (fromPostal) return fromPostal;
  }
  if (e.department) return looksLikeFrenchDeptCode(e.department);
  return null;
}

/** Hint affiché sous tous les champs de recherche d'établissement. */
export const ESTABLISHMENT_SEARCH_HINT =
  "Tapez le nom de l'établissement. Pour filtrer par département, ajoutez-le entre parenthèses : Jules (50) pour le code département, Jules (Seine) pour le nom.";

/** Label for selects/autocomplete: `Name (City - deptCode)` when city + code available, else name. */
export function formatEstablishmentSelectLabel(
  e: Pick<Establishment, 'name'> &
    Partial<Pick<Establishment, 'city' | 'department' | 'postalCode' | 'country'>>,
): string {
  const deptCode = resolveDepartmentCodeForLabel(e as Establishment);
  return e.city && deptCode ? `${e.name} (${e.city} - ${deptCode})` : e.name;
}
