// Client helpers for regulator display. The authoritative list lives in server/registries.ts.
export type VerificationScope = 'verified-in-malaysia' | 'verified-abroad';

const MALAYSIAN = /\((MMC|LJM|MDC)\)|malaysian (medical|nursing|dental) (council|board)|pharmacy board of malaysia/i;

export const isMalaysianCouncil = (name?: string) => MALAYSIAN.test(name || '');

/** What the annual licence expiry date is called for this regulator. */
export const expiryLabel = (councilName?: string) =>
  isMalaysianCouncil(councilName) ? 'Annual Practising Certificate (APC) expiry' : 'Licence expiry';

export const scopeOf = (p: { verificationScope?: VerificationScope; medicalCouncil?: string; nursingCouncil?: string }): VerificationScope =>
  p.verificationScope ?? (isMalaysianCouncil(p.medicalCouncil ?? p.nursingCouncil) ? 'verified-in-malaysia' : 'verified-abroad');
