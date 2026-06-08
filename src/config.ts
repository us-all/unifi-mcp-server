import dotenv from "dotenv";

dotenv.config({ quiet: true });

function parseList(raw: string | undefined): string[] | null {
  if (!raw) return null;
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function parseBool(raw: string | undefined): boolean {
  if (!raw) return false;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

export const config = {
  apiKey: process.env.UNIFI_API_KEY ?? "",
  ownerApiKey: process.env.UNIFI_API_KEY_OWNER ?? "",
  baseUrl: (process.env.UNIFI_API_URL ?? "https://api.ui.com/v1").replace(/\/+$/, ""),
  enabledCategories: parseList(process.env.UNIFI_TOOLS),
  disabledCategories: parseList(process.env.UNIFI_DISABLE),
  local: {
    url: (process.env.UNIFI_LOCAL_URL ?? "").replace(/\/+$/, ""),
    user: process.env.UNIFI_LOCAL_USER ?? "",
    pass: process.env.UNIFI_LOCAL_PASS ?? "",
    site: process.env.UNIFI_LOCAL_SITE ?? "default",
    insecure: parseBool(process.env.UNIFI_LOCAL_INSECURE),
  },
};

export function validateConfig(): void {
  if (!config.apiKey) {
    throw new Error("UNIFI_API_KEY environment variable is required");
  }
}

export function isConnectorAvailable(): boolean {
  return config.ownerApiKey.length > 0;
}

export function isLocalAvailable(): boolean {
  return config.local.url.length > 0 && config.local.user.length > 0 && config.local.pass.length > 0;
}
