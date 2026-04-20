import { unifiClient } from "../client.js";

interface HostInfo {
  id: string;
  hostName: string;
  siteId: string;
}

interface SiteInfo {
  siteId: string;
  hostId: string;
  hostName: string;
}

interface HostResponse {
  id: string;
  reportedState?: { hostname?: string };
}

interface SiteResponse {
  siteId: string;
  hostId: string;
}

interface DeviceHostEntry {
  hostId: string;
  hostName: string;
  devices: DeviceEntry[];
  updatedAt: string;
}

export interface DeviceEntry {
  id: string;
  mac: string;
  name: string;
  model: string;
  shortname: string;
  ip: string;
  productLine: string;
  status: string;
  version: string;
  firmwareStatus: string;
  isConsole: boolean;
  startupTime: string | null;
}

export async function resolveAllHosts(): Promise<HostInfo[]> {
  const response = await unifiClient.get<{ data: HostResponse[] }>("/hosts");
  return response.data.map((h) => ({
    id: h.id,
    hostName: h.reportedState?.hostname ?? "unknown",
    siteId: "",
  }));
}

export async function resolveAllSites(): Promise<SiteInfo[]> {
  const [hosts, sitesResp] = await Promise.all([
    unifiClient.get<{ data: HostResponse[] }>("/hosts"),
    unifiClient.get<{ data: SiteResponse[] }>("/sites"),
  ]);

  const hostMap = new Map<string, string>();
  for (const h of hosts.data) {
    hostMap.set(h.id, h.reportedState?.hostname ?? "unknown");
  }

  return sitesResp.data.map((s) => ({
    siteId: s.siteId,
    hostId: s.hostId,
    hostName: hostMap.get(s.hostId) ?? "unknown",
  }));
}

export async function resolveHostByName(name: string): Promise<HostInfo | null> {
  const hosts = await resolveAllHosts();
  const upper = name.toUpperCase();
  return hosts.find((h) => h.hostName.toUpperCase() === upper) ?? null;
}

export async function resolveAllDevices(): Promise<DeviceHostEntry[]> {
  const response = await unifiClient.get<{ data: DeviceHostEntry[] }>("/devices");
  return response.data;
}

export async function resolveDevicesByHostName(name: string): Promise<DeviceHostEntry | null> {
  const all = await resolveAllDevices();
  const upper = name.toUpperCase();
  return all.find((h) => h.hostName.toUpperCase() === upper) ?? null;
}

// --- Connector resolution helpers ---

import { connectorClient } from "../connector-client.js";

export interface ConnectorContext {
  hostId: string;
  hostName: string;
  localSiteId: string;
}

export async function resolveConnectorContext(name: string): Promise<ConnectorContext | null> {
  const host = await resolveHostByName(name);
  if (!host) return null;

  try {
    const resp = await connectorClient.get<{
      data: Array<{ id: string }>;
    }>(host.id, "network/integration/v1/sites");
    const localSiteId = resp.data?.[0]?.id;
    if (!localSiteId) return null;
    return { hostId: host.id, hostName: host.hostName, localSiteId };
  } catch {
    return null;
  }
}
