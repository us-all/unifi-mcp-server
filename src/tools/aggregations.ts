import { z } from "zod/v4";
import { unifiClient } from "../client.js";
import { connectorClient } from "../connector-client.js";
import { resolveDevicesByHostName, resolveConnectorContext } from "../helpers/resolver.js";
import { isConnectorAvailable } from "../config.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

/**
 * `summarize-site` — deep aggregated site view.
 * Goes beyond `analyze-site-health` by adding (when owner key available)
 * client list, networks, WiFi broadcasts, and firewall summary in one call.
 */

export const summarizeSiteSchema = z.object({
  name: z.string().describe("Site host name (e.g. 'USM')"),
  includeClients: z.boolean().optional().default(false).describe("Include connected clients (requires owner key)"),
  clientLimit: z.coerce.number().optional().default(50).describe("Max clients to fetch"),
  includeNetworks: z.boolean().optional().default(true).describe("Include network configs (requires owner key)"),
  includeWifi: z.boolean().optional().default(true).describe("Include WiFi broadcasts (requires owner key)"),
  extractFields: ef,
});

interface SiteWanInfo { wanUptime?: number; externalIp?: string }
interface SiteStats {
  counts?: { totalDevice?: number; offlineDevice?: number };
  gateway?: { shortname?: string };
  wans?: Record<string, SiteWanInfo>;
}

export async function summarizeSite(params: z.infer<typeof summarizeSiteSchema>) {
  const name = params.name;
  const hostEntry = await resolveDevicesByHostName(name);
  if (!hostEntry) {
    return { site: name, error: `site '${name}' not found`, summary: { found: false } };
  }

  const sitesResp = await unifiClient.get<{ data: Array<{ hostId: string; statistics: SiteStats }> }>("/sites").catch(() => ({ data: [] }));
  const siteData = sitesResp.data.find((s) => s.hostId === hostEntry.hostId);

  let connectorCtx = null;
  if (isConnectorAvailable() && (params.includeClients || params.includeNetworks || params.includeWifi)) {
    connectorCtx = await resolveConnectorContext(name).catch(() => null);
  }

  const [clientsR, networksR, wifiR] = connectorCtx
    ? await Promise.allSettled([
        params.includeClients
          ? connectorClient.get(connectorCtx.hostId, `network/integration/v1/sites/${connectorCtx.localSiteId}/clients`, { limit: params.clientLimit })
          : Promise.resolve(null),
        params.includeNetworks
          ? connectorClient.get(connectorCtx.hostId, `network/integration/v1/sites/${connectorCtx.localSiteId}/networks`)
          : Promise.resolve(null),
        params.includeWifi
          ? connectorClient.get(connectorCtx.hostId, `network/integration/v1/sites/${connectorCtx.localSiteId}/wifi-broadcasts`)
          : Promise.resolve(null),
      ])
    : [{ status: "fulfilled" as const, value: null }, { status: "fulfilled" as const, value: null }, { status: "fulfilled" as const, value: null }];

  const devices = hostEntry.devices;
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const wans = siteData?.statistics.wans ?? {};
  const minWanUptime = Object.values(wans).reduce<number | null>((acc, w) => {
    const u = w.wanUptime ?? null;
    if (u === null) return acc;
    return acc === null ? u : Math.min(acc, u);
  }, null);

  return {
    site: name,
    hostId: hostEntry.hostId,
    devices: { total: devices.length, online: onlineDevices, offline: devices.length - onlineDevices, list: devices },
    wan: wans,
    clients: clientsR.status === "fulfilled" ? clientsR.value : null,
    networks: networksR.status === "fulfilled" ? networksR.value : null,
    wifiBroadcasts: wifiR.status === "fulfilled" ? wifiR.value : null,
    summary: {
      gateway: siteData?.statistics.gateway?.shortname ?? "unknown",
      deviceOnlinePct: devices.length === 0 ? 0 : Math.round((onlineDevices / devices.length) * 1000) / 10,
      minWanUptime,
      connectorAvailable: !!connectorCtx,
      clientsIncluded: !!(clientsR.status === "fulfilled" && clientsR.value),
    },
  };
}
