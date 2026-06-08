import { z } from "zod";
import { localControllerClient, netPath } from "../local-controller-client.js";

function normalizeMac(mac: string): string {
  const clean = mac.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  if (clean.length !== 12) throw new Error(`invalid MAC: ${mac}`);
  return clean.match(/.{2}/g)!.join(":");
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

interface RawPort {
  port_idx?: number;
  name?: string;
  up?: boolean;
  speed?: number;
  full_duplex?: boolean;
  media?: string;
  rx_errors?: number;
  tx_errors?: number;
  rx_dropped?: number;
  tx_dropped?: number;
  rx_bytes?: number;
  tx_bytes?: number;
  rx_packets?: number;
  tx_packets?: number;
  link_down_count?: number;
  stp_state_change_count?: Array<{ change_count?: number; mst?: number }>;
  anomalies?: number;
  custom_anomalies?: number;
  satisfaction?: number;
  // SFP DDM (when port has a transceiver)
  sfp_found?: boolean;
  sfp_compliance?: string;
  sfp_part?: string;
  sfp_vendor?: string;
  sfp_serial?: string;
  sfp_rev?: string;
  sfp_temperature?: string | number;
  sfp_voltage?: string | number;
  sfp_current?: string | number;
  sfp_rxpower?: string | number;
  sfp_txpower?: string | number;
  sfp_txfault?: boolean;
  sfp_rxfault?: boolean;
}

interface RawDevice {
  mac?: string;
  name?: string;
  model?: string;
  type?: string;
  port_table?: RawPort[];
}

interface StatDeviceResponse {
  meta?: { rc?: string };
  data?: RawDevice[];
}

function summarizePort(p: RawPort) {
  const sfp = p.sfp_found
    ? {
        present: true,
        compliance: p.sfp_compliance,
        part: p.sfp_part,
        vendor: p.sfp_vendor,
        serial: p.sfp_serial,
        rev: p.sfp_rev,
        temperatureC: num(p.sfp_temperature),
        voltageV: num(p.sfp_voltage),
        txBiasMa: num(p.sfp_current),
        rxPowerDbm: num(p.sfp_rxpower),
        txPowerDbm: num(p.sfp_txpower),
        rxFault: p.sfp_rxfault,
        txFault: p.sfp_txfault,
      }
    : undefined;
  const stpChanges = p.stp_state_change_count?.[0]?.change_count ?? 0;
  return {
    idx: p.port_idx,
    name: p.name,
    media: p.media,
    up: p.up,
    speedMbps: p.speed,
    fullDuplex: p.full_duplex,
    rxErrors: p.rx_errors ?? 0,
    txErrors: p.tx_errors ?? 0,
    rxDropped: p.rx_dropped ?? 0,
    txDropped: p.tx_dropped ?? 0,
    rxBytes: p.rx_bytes,
    txBytes: p.tx_bytes,
    rxPackets: p.rx_packets,
    txPackets: p.tx_packets,
    linkDownCount: p.link_down_count ?? 0,
    stpChangeCount: stpChanges,
    anomalies: p.anomalies ?? 0,
    customAnomalies: p.custom_anomalies ?? 0,
    satisfaction: p.satisfaction,
    sfp,
  };
}

// =====================================================================
// get-port-errors
// =====================================================================

export const getPortErrorsSchema = z.object({
  deviceMac: z.string().describe("Device MAC (with or without colons; e.g. '0CEA14B96081' or '0c:ea:14:b9:60:81')"),
  portIdx: z.coerce.number().int().min(1).optional().describe("1-based port index. Omit to return all ports."),
  onlyProblems: z.coerce.boolean().optional().default(false).describe("Filter to ports with rx/tx errors > 0, link_down_count > 0, or SFP fault"),
});

export async function getPortErrors(params: z.infer<typeof getPortErrorsSchema>) {
  const mac = normalizeMac(params.deviceMac);
  const res = await localControllerClient.get<StatDeviceResponse>(netPath(`/stat/device/${mac}`));
  const device = res.data?.[0];
  if (!device) {
    return { mac, error: "device not found in controller response" };
  }
  let ports = (device.port_table ?? []).map(summarizePort);
  if (params.portIdx) ports = ports.filter((p) => p.idx === params.portIdx);
  if (params.onlyProblems) {
    ports = ports.filter(
      (p) =>
        p.rxErrors > 0 ||
        p.txErrors > 0 ||
        p.linkDownCount > 0 ||
        p.sfp?.rxFault === true ||
        p.sfp?.txFault === true,
    );
  }
  const totals = ports.reduce(
    (a, p) => ({
      rxErrors: a.rxErrors + p.rxErrors,
      txErrors: a.txErrors + p.txErrors,
      rxDropped: a.rxDropped + p.rxDropped,
      txDropped: a.txDropped + p.txDropped,
      linkDownCount: a.linkDownCount + p.linkDownCount,
    }),
    { rxErrors: 0, txErrors: 0, rxDropped: 0, txDropped: 0, linkDownCount: 0 },
  );
  return {
    device: { mac: device.mac ?? mac, name: device.name, model: device.model },
    portCount: ports.length,
    totals,
    ports,
    caveats: [
      "Counters reset on device reboot. linkDownCount/stpChangeCount accumulate since last boot.",
      "SFP DDM (rxPowerDbm/txPowerDbm/temperatureC) is only present on ports with a UFiber-compatible transceiver.",
    ],
  };
}

// =====================================================================
// list-port-flap-summary  (replaces the originally-planned event-log filter:
// the controller's /stat/event endpoint is unavailable on Network 10.4+ with
// a read-only role. linkDownCount + stpChangeCount in port_table are a
// superior signal — persistent across queries and ranked fleet-wide.)
// =====================================================================

export const listPortFlapSummarySchema = z.object({
  minLinkDownCount: z.coerce.number().int().min(0).optional().default(1)
    .describe("Only include ports with linkDownCount >= this value (default 1)"),
  topN: z.coerce.number().int().min(1).max(200).optional().default(20)
    .describe("Max ports to return, sorted by flap score desc (default 20)"),
});

interface DeviceListEntry {
  mac?: string;
  name?: string;
  model?: string;
  type?: string;
  uptime?: number;
}

interface DeviceListResponse {
  meta?: { rc?: string };
  data?: DeviceListEntry[];
}

export async function listPortFlapSummary(params: z.infer<typeof listPortFlapSummarySchema>) {
  // 1. List all switches (type=usw) on the controller
  const devList = await localControllerClient.get<DeviceListResponse>(netPath("/stat/device"));
  const switches = (devList.data ?? []).filter((d) => d.type === "usw" && d.mac);
  // 2. For each switch, pull full port_table
  const perDevice = await Promise.all(
    switches.map(async (sw) => {
      const detail = await localControllerClient.get<StatDeviceResponse>(
        netPath(`/stat/device/${sw.mac}`),
      );
      const dev = detail.data?.[0];
      const ports = (dev?.port_table ?? []).map(summarizePort);
      return {
        device: { mac: sw.mac, name: sw.name, model: sw.model, uptimeSec: sw.uptime },
        ports,
      };
    }),
  );
  // 3. Flatten + score + filter + rank
  type Row = {
    device: string;
    deviceMac: string;
    deviceUptimeSec?: number;
    portIdx?: number;
    portName?: string;
    up?: boolean;
    linkDownCount: number;
    stpChangeCount: number;
    rxErrors: number;
    txErrors: number;
    score: number;
  };
  const rows: Row[] = [];
  for (const { device, ports } of perDevice) {
    for (const p of ports) {
      if (p.linkDownCount < params.minLinkDownCount) continue;
      rows.push({
        device: device.name ?? device.mac ?? "?",
        deviceMac: device.mac ?? "",
        deviceUptimeSec: device.uptimeSec,
        portIdx: p.idx,
        portName: p.name,
        up: p.up,
        linkDownCount: p.linkDownCount,
        stpChangeCount: p.stpChangeCount,
        rxErrors: p.rxErrors,
        txErrors: p.txErrors,
        score: p.linkDownCount * 2 + p.stpChangeCount + p.rxErrors + p.txErrors,
      });
    }
  }
  rows.sort((a, b) => b.score - a.score);
  return {
    switchCount: switches.length,
    flappingPortCount: rows.length,
    threshold: { minLinkDownCount: params.minLinkDownCount },
    topPorts: rows.slice(0, params.topN),
    caveats: [
      "linkDownCount and stpChangeCount accumulate since the switch's last reboot. A reboot zeroes them.",
      "deviceUptimeSec gives context: low uptime + low counters can still mean active flapping.",
      "Source: legacy /stat/device port_table. /stat/event is unavailable in Network 10.4+ readonly role.",
    ],
  };
}
