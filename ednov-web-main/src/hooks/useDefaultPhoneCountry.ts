import { useThemeStore } from '@/stores/themeStore';
import { countryNameToIso } from '@/utils/phone-contact-utils';
import { phoneFormats } from '@/utils/phone-formats';

/**
 * Returns the default phone country code (ISO format like 'FR', 'TN', etc.)
 * based on the company's country from branding data.
 *
 * Fallback to 'FR' if:
 * - companyCountry is null
 * - countryNameToIso returns null (country name not mapped)
 * - ISO code not supported in phoneFormats
 */
export function useDefaultPhoneCountry(): string {
  const companyCountry = useThemeStore((state) => state.companyCountry);

  // Convert country name (e.g. "France") to ISO code (e.g. "FR")
  const iso = countryNameToIso(companyCountry);

  // Check if the ISO code is supported in our phone formats
  if (iso && phoneFormats[iso]) {
    return iso;
  }

  // Fallback to France
  return 'FR';
}
