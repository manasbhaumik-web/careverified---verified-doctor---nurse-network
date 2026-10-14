/**
 * Regulator catalogue. Malaysian registers are checked by an admin (no public API is
 * available to us), so `registerUrl` is only a pointer for the reviewer.
 * `registerUrl` values marked unconfirmed must be verified before launch.
 */
export type RegistryId = "MMC" | "LJM" | "MDC" | "PHARMACY_BOARD" | "FACILITY_586" | "OTHER";
export type RegistrationType = "full" | "provisional" | "specialist";

export interface Lookup {
  /** online-register: reviewer searches a public page. contact-regulator: no public search found; ask the regulator. none: no route found. */
  method: "online-register" | "contact-regulator" | "none";
  url: string | null;
  contact?: string;
  /** Guidance shown to the reviewing admin. */
  note: string;
}

export interface Registry {
  id: RegistryId;
  name: string;
  country: string; // ISO 3166-1 alpha-2, or "XX" for "any other country"
  /** Practitioner roles that can register with this body in the app today. [] = catalogued for later use. */
  roles: Array<"doctor" | "nurse">;
  supportsSpecialist: boolean;
  lookup: Lookup;
  /** Name of the annual licence the expiry date refers to. */
  expiryLabel: string;
}

// Lookup routes come from web research (Oct 2026); none could be tested from here, so confirm each before launch.
export const REGISTRIES: Registry[] = [
  {
    id: "MMC", name: "Malaysian Medical Council (MMC)", country: "MY", roles: ["doctor"], supportsSpecialist: true,
    expiryLabel: "Annual Practising Certificate (APC) expiry",
    lookup: { method: "online-register", url: "https://merits.mmc.gov.my/search/registeredDoctor",
      note: "Search the MMC register of registered doctors; for specialists also confirm the National Specialist Register. Record the page URL and date. Unconfirmed: the public site was not reachable during research, and sources gave conflicting addresses (mmc.gov.my)." },
  },
  {
    id: "LJM", name: "Malaysian Nursing Board (LJM)", country: "MY", roles: ["nurse"], supportsSpecialist: false,
    expiryLabel: "Annual Practising Certificate (APC) expiry",
    lookup: { method: "contact-regulator", url: "https://hq.moh.gov.my/nursing", contact: "nursing@moh.gov.my · 03-8883 3553",
      note: "No public nurse register search was found. Ask the Nursing Board to confirm the registration number and current APC year (also ask the nurse for the APC certificate), then record who confirmed and when." },
  },
  {
    id: "MDC", name: "Malaysian Dental Council (MDC)", country: "MY", roles: [], supportsSpecialist: true,
    expiryLabel: "Annual Practising Certificate (APC) expiry",
    lookup: { method: "online-register", url: "https://mdc.moh.gov.my", note: "Public register search by name or registration number is reported but unconfirmed. Dental practitioners are not an app role yet." },
  },
  {
    id: "PHARMACY_BOARD", name: "Pharmacy Board of Malaysia", country: "MY", roles: [], supportsSpecialist: false,
    expiryLabel: "Annual Retention Certificate expiry",
    lookup: { method: "contact-regulator", url: "https://pharmacy.moh.gov.my", contact: "03-7841 3200", note: "No public pharmacist search was found; contact the Board. The pharmacy workspace has its own licence check." },
  },
  {
    id: "FACILITY_586", name: "MOH private healthcare facility licence (Act 586)", country: "MY", roles: [], supportsSpecialist: false,
    expiryLabel: "Facility licence expiry",
    lookup: { method: "contact-regulator", url: null, contact: "Private Medical Practice Control Section (CKAPS) / state health department", note: "No public facility licence register was found; request a copy of the licence and confirm with CKAPS." },
  },
  {
    id: "OTHER", name: "Another country's regulator", country: "XX", roles: ["doctor", "nurse"], supportsSpecialist: true,
    expiryLabel: "Licence expiry",
    lookup: { method: "none", url: null, note: "Check the regulator's own public register for that country and record the URL." },
  },
];

export const REGISTRATION_TYPES: RegistrationType[] = ["full", "provisional", "specialist"];

export const findRegistry = (id: unknown) => REGISTRIES.find(r => r.id === id);

export type VerificationScope = "verified-in-malaysia" | "verified-abroad";

/** Where the licence was checked: a Malaysian register or a foreign one. */
export const scopeFor = (registryId: unknown): VerificationScope =>
  findRegistry(registryId)?.country === "MY" ? "verified-in-malaysia" : "verified-abroad";

/** Legacy profiles only have a free-text council name; infer the registry from it. */
export function inferRegistryId(councilName: string | undefined): RegistryId {
  const n = (councilName || "").toLowerCase();
  if (n.includes("(mmc)") || n.includes("malaysian medical council")) return "MMC";
  if (n.includes("(ljm)") || n.includes("malaysian nursing board")) return "LJM";
  return "OTHER";
}
