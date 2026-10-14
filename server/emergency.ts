/**
 * Emergency numbers by country, for patients who use the platform while travelling.
 * Compiled from general knowledge, not an authoritative source: verify each entry before launch.
 * An unknown country gets the GSM-standard 112 plus a prompt to look up the local number.
 */
export interface EmergencyNumber { label: string; number: string }

const N = (label: string, number: string): EmergencyNumber => ({ label, number });

const TABLE: Record<string, EmergencyNumber[]> = {
  MY: [N("National emergency (ambulance, police, fire)", "999"), N("Emergency from a mobile phone", "112")],
  SG: [N("Ambulance and fire", "995"), N("Police", "999")],
  BN: [N("Ambulance", "991"), N("Police", "993"), N("Fire", "995")],
  ID: [N("National emergency", "112")],
  TH: [N("Medical emergency", "1669"), N("Police", "191")],
  PH: [N("National emergency", "911")],
  VN: [N("Ambulance", "115"), N("Police", "113")],
  IN: [N("National emergency", "112"), N("Ambulance", "108")],
  CN: [N("Ambulance", "120"), N("Police", "110")],
  HK: [N("Emergency", "999")],
  JP: [N("Ambulance and fire", "119"), N("Police", "110")],
  KR: [N("Ambulance and fire", "119"), N("Police", "112")],
  AU: [N("Emergency", "000")],
  NZ: [N("Emergency", "111")],
  GB: [N("Emergency", "999"), N("Emergency (also works)", "112")],
  US: [N("Emergency", "911")],
  CA: [N("Emergency", "911")],
  SA: [N("Ambulance", "997"), N("Police", "999")],
  AE: [N("Ambulance", "998"), N("Police", "999")],
  BD: [N("Emergency", "999")],
  PK: [N("Ambulance", "1122"), N("Police", "15")],
  LK: [N("Ambulance", "1990"), N("Police", "119")],
};

// European Union members use 112.
for (const c of ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]) {
  TABLE[c] ??= [N("Emergency", "112")];
}

export const FALLBACK_NUMBERS: EmergencyNumber[] = [N("Emergency (works on mobile phones in many countries)", "112")];

export const emergencyNumbersForCountry = (country: string): EmergencyNumber[] => TABLE[country] ?? FALLBACK_NUMBERS;
export const hasEmergencyNumbersFor = (country: string) => country in TABLE;
