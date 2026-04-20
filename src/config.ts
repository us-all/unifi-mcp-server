import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const config = {
  apiKey: process.env.UNIFI_API_KEY ?? "",
  ownerApiKey: process.env.UNIFI_API_KEY_OWNER ?? "",
  baseUrl: (process.env.UNIFI_API_URL ?? "https://api.ui.com/v1").replace(/\/+$/, ""),
};

export function validateConfig(): void {
  if (!config.apiKey) {
    throw new Error("UNIFI_API_KEY environment variable is required");
  }
}

export function isConnectorAvailable(): boolean {
  return config.ownerApiKey.length > 0;
}
