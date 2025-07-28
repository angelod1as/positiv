import type { ProfileApprovedToAttendStatus, ProfileFlagStatus } from '~/types/database/entities.types';

/**
 * Maps CSV flag values (emojis) to database flag enum values
 */
export const flagMapping: Record<string, ProfileFlagStatus> = {
  '🚨': 'red',
  '🤔': 'yellow',
  '': 'none',
};

/**
 * Maps CSV approved_to_attend values to database enum values
 */
export const approvedToAttendMapping: Record<string, ProfileApprovedToAttendStatus> = {
  'TRUE': 'approved',
  'FALSE': 'rejected',
  'Não': 'rejected',
  'Não sei': 'pending',
  'Ainda não': 'pending',
  '': 'pending',
};

/**
 * Maps various gender representations from CSV to standard database values
 */
export const genderMapping: Record<string, string> = {
  // Exact matches (case insensitive will be handled in the function)
  'Mulher cis': 'Mulher cis',
  'Mulher trans': 'Mulher trans',
  'Travesti': 'Travesti',
  'Pessoa não binária': 'Pessoa não binária',
  'Pessoa agênera': 'Pessoa agênera',
  'Homem trans': 'Homem trans',
  'Homem cis': 'Homem cis',
  
  // Common variations
  'NB': 'Pessoa não binária',
  'Não binárie': 'Pessoa não binária',
  'Não binário': 'Pessoa não binária',
  'Não binária': 'Pessoa não binária',
  'Pessoa não-binária': 'Pessoa não binária',
  'Gênero fluide': 'Pessoa não binária',
  'Transmasculino NB': 'Pessoa não binária',
  'Sapatão masculino': 'Pessoa não binária', // Based on CSV context
  
  // Trans variations
  'Mulher Trans': 'Mulher trans',
  'Mulher trans / Travesti': 'Mulher trans',
  'Mulher Trans / Travesti': 'Mulher trans',
  
  // Cis variations
  'M Cis': 'Mulher cis',
  'H Cis': 'Homem cis',
};

/**
 * Maps various orientation representations from CSV to standard database values
 */
export const orientationMapping: Record<string, string> = {
  // Exact matches
  'Hétero': 'Hétero',
  'Gay': 'Gay',
  'Sapatão': 'Sapatão',
  'Bi': 'Bi',
  'Pan': 'Pan',
  'Demi': 'Demi',
  'Ace': 'Ace',
  
  // Common variations
  'Heterossexual': 'Hétero',
  'Bissexual': 'Bi',
  'Pansexual': 'Pan',
  'Demissexual': 'Demi',
  'Assexual': 'Ace',
  
  // Combined orientations - take the first one
  'Bi, Pan': 'Bi',
  'Bi, Pan, Demi': 'Bi',
  'Sapatão, Bi': 'Sapatão',
  'Hétero, Demi': 'Hétero',
};

/**
 * Gets mapped flag value with fallback to 'none'
 */
export function getFlag(csvValue: string | undefined): ProfileFlagStatus {
  if (!csvValue) return 'none';
  return flagMapping[csvValue.trim()] || 'none';
}

/**
 * Gets mapped approved_to_attend value with fallback to 'pending'
 */
export function getApprovedStatus(csvValue: string | undefined): ProfileApprovedToAttendStatus {
  if (!csvValue) return 'pending';
  return approvedToAttendMapping[csvValue.trim()] || 'pending';
}

/**
 * Gets mapped gender value, returns original if no mapping found
 */
export function getGender(csvValue: string | undefined): string | undefined {
  if (!csvValue || csvValue.trim() === '') return undefined;
  
  const trimmed = csvValue.trim();
  
  // First try exact match
  if (genderMapping[trimmed]) {
    return genderMapping[trimmed];
  }
  
  // Try case-insensitive match
  const lowerCase = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(genderMapping)) {
    if (key.toLowerCase() === lowerCase) {
      return value;
    }
  }
  
  // Return original value if no mapping found
  return trimmed;
}

/**
 * Gets mapped orientation value, returns original if no mapping found
 */
export function getOrientation(csvValue: string | undefined): string | undefined {
  if (!csvValue || csvValue.trim() === '') return undefined;
  
  const trimmed = csvValue.trim();
  
  // First try exact match
  if (orientationMapping[trimmed]) {
    return orientationMapping[trimmed];
  }
  
  // For combined orientations, take the first one
  if (trimmed.includes(',')) {
    const firstOrientation = trimmed.split(',')[0].trim();
    if (orientationMapping[firstOrientation]) {
      return orientationMapping[firstOrientation];
    }
  }
  
  // Try case-insensitive match
  const lowerCase = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(orientationMapping)) {
    if (key.toLowerCase() === lowerCase) {
      return value;
    }
  }
  
  // Return original value if no mapping found
  return trimmed;
}

/**
 * Normalizes phone number to digits only and adds area code if needed
 */
export function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If it's less than 10 digits (missing area code), add São Paulo area code
  if (digitsOnly.length === 8 || digitsOnly.length === 9) {
    return '11' + digitsOnly;
  }
  
  return digitsOnly;
}

/**
 * Normalizes RG by removing hyphens, dots, and spaces
 */
export function normalizeRG(rg: string | undefined): string | undefined {
  if (!rg) return undefined;
  
  // Remove hyphens, dots, and spaces
  return rg.replace(/[-.\s]/g, '');
}