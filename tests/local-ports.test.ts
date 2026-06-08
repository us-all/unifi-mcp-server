import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config.js", () => ({
  config: {
    apiKey: "x", ownerApiKey: "", baseUrl: "https://api.ui.com/v1",
    enabledCategories: null, disabledCategories: null,
    local: { url: "https://10.0.0.1", user: "u", pass: "p", site: "default", insecure: true },
  },
  isLocalAvailable: () => true,
}));

vi.mock("../src/local-controller-client.js", () => {
  const getMock = vi.fn();
  return {
    netPath: (s: string) => `/proxy/network/api/s/default${s.startsWith("/") ? s : "/" + s}`,
    localControllerClient: { get: getMock },
    LocalControllerError: class extends Error { status = 0; body: unknown; },
    LocalControllerUnavailableError: class extends Error {},
    _getMock: getMock,
  };
});

import {
  getPortErrors,
  listPortFlapSummary,
} from "../src/tools/local-ports.js";
import { localControllerClient } from "../src/local-controller-client.js";

const getMock = (localControllerClient.get as unknown) as ReturnType<typeof vi.fn>;

const DEVICE_RESPONSE = {
  meta: { rc: "ok" },
  data: [{
    mac: "0c:ea:14:b9:60:81",
    name: "4F-L2",
    model: "US48PRO",
    type: "usw",
    port_table: [
      {
        port_idx: 1, name: "Port 1", up: false, speed: 0, full_duplex: false, media: "GE",
        rx_errors: 0, tx_errors: 0, rx_dropped: 0, tx_dropped: 0,
        link_down_count: 0, stp_state_change_count: [{ change_count: 0, mst: 0 }],
        anomalies: 0,
      },
      {
        port_idx: 17, name: "Port 17", up: true, speed: 1000, full_duplex: true, media: "GE",
        rx_errors: 0, tx_errors: 0, rx_dropped: 0, tx_dropped: 0,
        rx_bytes: 100, tx_bytes: 200, rx_packets: 10, tx_packets: 20,
        link_down_count: 3, stp_state_change_count: [{ change_count: 7, mst: 0 }],
        anomalies: 0, satisfaction: 100,
      },
      {
        port_idx: 52, name: "SFP+ 4", up: true, speed: 10000, full_duplex: true, media: "SFP+",
        rx_errors: 0, tx_errors: 0, rx_dropped: 0, tx_dropped: 0,
        link_down_count: 1, stp_state_change_count: [{ change_count: 3, mst: 0 }],
        sfp_found: true,
        sfp_compliance: "10GBase-LR",
        sfp_part: "OM-SM-10G-D",
        sfp_vendor: "Ubiquiti Inc.",
        sfp_serial: "AX25061402692",
        sfp_temperature: "52.140",
        sfp_voltage: "3.325",
        sfp_current: "45.974",
        sfp_rxpower: "-1.98",
        sfp_txpower: "-2.75",
        sfp_rxfault: false,
        sfp_txfault: false,
      },
    ],
  }],
};

beforeEach(() => getMock.mockReset());

describe("get-port-errors", () => {
  it("returns all ports with totals when portIdx omitted", async () => {
    getMock.mockResolvedValueOnce(DEVICE_RESPONSE);
    const result = await getPortErrors({ deviceMac: "0CEA14B96081", onlyProblems: false });
    expect(result.device.name).toBe("4F-L2");
    expect(result.portCount).toBe(3);
    expect(result.totals.linkDownCount).toBe(4); // 0 + 3 + 1
    expect(result.ports[1].linkDownCount).toBe(3);
    expect(result.ports[1].stpChangeCount).toBe(7);
  });

  it("filters by portIdx", async () => {
    getMock.mockResolvedValueOnce(DEVICE_RESPONSE);
    const result = await getPortErrors({ deviceMac: "0c:ea:14:b9:60:81", portIdx: 17, onlyProblems: false });
    expect(result.portCount).toBe(1);
    expect(result.ports[0].idx).toBe(17);
  });

  it("parses SFP DDM with numeric coercion", async () => {
    getMock.mockResolvedValueOnce(DEVICE_RESPONSE);
    const result = await getPortErrors({ deviceMac: "0CEA14B96081", portIdx: 52, onlyProblems: false });
    const sfp = result.ports[0].sfp;
    expect(sfp?.present).toBe(true);
    expect(sfp?.rxPowerDbm).toBeCloseTo(-1.98);
    expect(sfp?.txPowerDbm).toBeCloseTo(-2.75);
    expect(sfp?.temperatureC).toBeCloseTo(52.14);
    expect(sfp?.compliance).toBe("10GBase-LR");
    expect(sfp?.rxFault).toBe(false);
  });

  it("onlyProblems filters to ports with link_down_count > 0", async () => {
    getMock.mockResolvedValueOnce(DEVICE_RESPONSE);
    const result = await getPortErrors({ deviceMac: "0CEA14B96081", onlyProblems: true });
    // Port 1 has all zeros, port 17 has linkDownCount=3, port 52 has linkDownCount=1
    expect(result.portCount).toBe(2);
    expect(result.ports.map((p) => p.idx).sort()).toEqual([17, 52]);
  });

  it("rejects malformed MAC", async () => {
    await expect(getPortErrors({ deviceMac: "not-a-mac", onlyProblems: false })).rejects.toThrow(/invalid MAC/);
  });
});

describe("list-port-flap-summary", () => {
  it("ranks ports across switches by flap score", async () => {
    // First call: /stat/device (device list)
    getMock.mockResolvedValueOnce({
      data: [
        { mac: "0c:ea:14:b9:60:81", name: "4F-L2", model: "US48PRO", type: "usw", uptime: 21600 },
        { mac: "1c:6a:1b:e0:68:fd", name: "USW Aggregation", model: "USL8A", type: "usw", uptime: 5_184_000 },
      ],
    });
    // Per-device port_table calls
    getMock.mockResolvedValueOnce(DEVICE_RESPONSE);
    getMock.mockResolvedValueOnce({
      data: [{
        mac: "1c:6a:1b:e0:68:fd", name: "USW Aggregation", model: "USL8A", type: "usw",
        port_table: [
          {
            port_idx: 7, name: "SFP+ 7", up: true, speed: 10000,
            rx_errors: 1_291_725, tx_errors: 0,
            link_down_count: 6, stp_state_change_count: [{ change_count: 13, mst: 0 }],
          },
        ],
      }],
    });
    const result = await listPortFlapSummary({ minLinkDownCount: 1, topN: 10 });
    expect(result.switchCount).toBe(2);
    expect(result.flappingPortCount).toBe(3); // ports 17, 52 from 4F-L2 + port 7 from aggregation
    // SFP+ 7 should be #1 because rx_errors dominate score
    expect(result.topPorts[0].portName).toBe("SFP+ 7");
    expect(result.topPorts[0].score).toBeGreaterThan(1_000_000);
  });

  it("filters by minLinkDownCount", async () => {
    getMock.mockResolvedValueOnce({
      data: [{ mac: "0c:ea:14:b9:60:81", name: "4F-L2", model: "US48PRO", type: "usw", uptime: 21600 }],
    });
    getMock.mockResolvedValueOnce(DEVICE_RESPONSE);
    const result = await listPortFlapSummary({ minLinkDownCount: 3, topN: 10 });
    // Only port 17 has linkDownCount >= 3 in DEVICE_RESPONSE
    expect(result.flappingPortCount).toBe(1);
    expect(result.topPorts[0].portIdx).toBe(17);
  });

  it("ignores non-switch devices", async () => {
    getMock.mockResolvedValueOnce({
      data: [
        { mac: "aa:bb:cc:dd:ee:ff", name: "AP-1", type: "uap" },
        { mac: "0c:ea:14:b9:60:81", name: "4F-L2", type: "usw", uptime: 21600 },
      ],
    });
    getMock.mockResolvedValueOnce(DEVICE_RESPONSE);
    const result = await listPortFlapSummary({ minLinkDownCount: 1, topN: 10 });
    expect(result.switchCount).toBe(1); // AP filtered out
  });
});
