/**
 * Register lookup providers.
 *
 * The MMC API slot exists so an official integration can be dropped in later, but it is
 * deliberately NOT connected: there is no known public MMC API, and scraping MeRITS is not
 * allowed here. Until the MMC grants written access, every Malaysian check stays manual
 * (the reviewing admin records a reference).
 */
import type { RegistryId } from "./registries";

export interface RegisterLookupResult {
  found: boolean;
  registrationType?: "full" | "provisional" | "specialist";
  apcExpiry?: string; // YYYY-MM-DD
  checkedAt: string;
}

export interface RegisterProvider {
  registryId: RegistryId;
  mode: "manual" | "api" | "mock";
  /** Why the provider cannot be used right now, or null if it is ready. */
  unavailableReason(): string | null;
  lookup(registrationNumber: string): Promise<RegisterLookupResult>;
}

export class NotConnectedError extends Error {
  constructor(reason: string) { super(reason); this.name = "NotConnectedError"; }
}

/** Placeholder for an official MMC integration. Makes no network requests. */
const mmcApi: RegisterProvider = {
  registryId: "MMC",
  mode: "api",
  unavailableReason() {
    // Requires BOTH an explicit opt-in and credentials issued under a written agreement with the MMC.
    if (process.env.MMC_API_ENABLED !== "true") return "Disabled: no agreement with the MMC for API access.";
    if (!process.env.MMC_API_BASE_URL || !process.env.MMC_API_KEY) return "Enabled but MMC_API_BASE_URL / MMC_API_KEY are not set.";
    return "Not implemented: add the client once the MMC provides its API specification.";
  },
  async lookup() {
    // Intentionally no request is made. Implement only against an MMC-provided specification.
    throw new NotConnectedError(this.unavailableReason() ?? "Not connected.");
  },
};

/**
 * Deterministic mock register for development and tests. TODO: real integration (replace with a client built on a regulator-provided specification).
 * Makes no network requests. A registration number ending in "0" is "not found"; otherwise it is found with an expiry derived from the number.
 */
export function mockProviderFor(registryId: RegistryId): RegisterProvider {
  return {
    registryId,
    mode: "mock",
    unavailableReason: () => null,
    async lookup(registrationNumber: string): Promise<RegisterLookupResult> {
      const n = String(registrationNumber).trim();
      const checkedAt = new Date().toISOString();
      if (!n || n.endsWith("0")) return { found: false, checkedAt };
      const year = 2027 + (n.length % 3);
      return { found: true, registrationType: n.toUpperCase().startsWith("SP") ? "specialist" : "full", apcExpiry: `${year}-12-31`, checkedAt };
    },
  };
}

const PROVIDERS: RegisterProvider[] = [mmcApi];

/** The adapter used for a registry: the mock when REGISTRY_ADAPTER=mock, else the real provider if one exists (none do yet), else null (manual review). */
export const adapterFor = (id: RegistryId): RegisterProvider | null =>
  process.env.REGISTRY_ADAPTER === "mock" ? mockProviderFor(id) : providerFor(id);

export const providerFor = (id: RegistryId) => PROVIDERS.find(p => p.registryId === id) ?? null;

export const integrationStatus = () =>
  PROVIDERS.map(p => ({ registryId: p.registryId, mode: p.mode, connected: false, reason: p.unavailableReason(), fallback: "manual admin check with recorded reference" }));
