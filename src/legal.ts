export type LegalTab = 'notice' | 'terms' | 'mine' | 'admin';
export const LEGAL_EVENT = 'medcred-open-legal';

/** Open the privacy centre from anywhere (footer, registration forms, account menu). */
export const openLegal = (tab: LegalTab = 'notice') =>
  window.dispatchEvent(new CustomEvent<LegalTab>(LEGAL_EVENT, { detail: tab }));
