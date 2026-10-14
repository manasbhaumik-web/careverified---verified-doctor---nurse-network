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
  mode: "manual" | "api";
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

const PROVIDERS: RegisterProvider[] = [mmcApi];

export const providerFor = (id: RegistryId) => PROVIDERS.find(p => p.registryId === id) ?? null;

export const integrationStatus = () =>
  PROVIDERS.map(p => ({ registryId: p.registryId, mode: p.mode, connected: false, reason: p.unavailableReason(), fallback: "manual admin check with recorded reference" }));
