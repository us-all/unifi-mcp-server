# UniFi MCP Server

**UniFi semantic analysis library** — fleet-wide health, anomaly detection, and cross-site analytics on top of the UniFi Cloud API.

If you need broad raw API coverage including Protect/Access and write operations, see [sirkirby/unifi-mcp](https://github.com/sirkirby/unifi-mcp) (234 tools). Use this server when you want **judgments, not just data** — site health verdicts, fleet outlier detection, firmware inventory diffs, WAN uptime aggregates, and top-bandwidth clients — with built-in severity classification and curated thresholds.

## Features

- **51 tools** (7 semantic analysis + 9 raw Site Manager + 35 Cloud Connector)
- **Semantic analysis** — site health, reboot detection, fleet comparison, firmware inventory, WAN uptime trend, top-bandwidth clients
- **Severity classification** — `healthy` / `info` / `warning` / `critical` with curated thresholds (uptime, reboot recency, etc.)
- **Cloud Connector** — access local device/client/network data via cloud proxy
- **Dual API key routing** — separate keys for Site Manager API and Cloud Connector
- **Read-only** — safe to use, no mutation operations

## Quick Start

```bash
git clone https://github.com/us-all/unifi-mcp-server.git
cd unifi-mcp-server
pnpm install
pnpm run build
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `UNIFI_API_KEY` | Yes | API key from [unifi.ui.com](https://unifi.ui.com) → Settings → API |
| `UNIFI_API_KEY_OWNER` | No | Owner account API key — enables 33 Cloud Connector tools |
| `UNIFI_API_URL` | No | API base URL (default: `https://api.ui.com/v1`) |

## Claude Code

```bash
claude mcp add unifi \
  -e UNIFI_API_KEY=your-key \
  -e UNIFI_API_KEY_OWNER=your-owner-key \
  -- node /path/to/unifi-mcp-server/dist/index.js
```

## Tools (45)

### Analysis Tools (3)

| Tool | Description |
|---|---|
| `list-sites-overview` | Health overview of all sites with severity |
| `analyze-site-health` | Detailed health analysis for a site by name |
| `detect-recent-reboots` | Detect device reboots within a time window |

### Site Manager API Tools (9)

| Tool | Description |
|---|---|
| `list-hosts` | List all console hosts |
| `get-host` | Get host details by ID |
| `list-sites` | List sites with statistics |
| `list-devices` | List all devices across hosts |
| `get-isp-metrics` | ISP performance metrics (optional) |
| `query-isp-metrics` | Query ISP metrics with filters (optional) |
| `list-sdwan-configs` | List SD-WAN configurations |
| `get-sdwan-config` | Get SD-WAN config by ID |
| `get-sdwan-config-status` | Get SD-WAN config status |

### Cloud Connector Tools (33, requires `UNIFI_API_KEY_OWNER`)

| Category | Tools |
|---|---|
| **App Info** | `get-app-info` |
| **Sites** | `list-local-sites` |
| **Devices** | `get-device-details`, `get-device-by-id`, `get-device-statistics`, `list-pending-devices` |
| **Clients** | `list-site-clients`, `get-client-details` |
| **Networks** | `list-networks`, `get-network-details`, `get-network-references` |
| **WiFi** | `list-wifi-broadcasts`, `get-wifi-broadcast-details` |
| **Hotspot** | `list-vouchers`, `get-voucher-details` |
| **Firewall** | `list-firewall-zones`, `get-firewall-zone`, `list-firewall-policies`, `get-firewall-policy`, `get-firewall-policy-ordering` |
| **ACL** | `list-acl-rules`, `get-acl-rule`, `get-acl-rule-ordering` |
| **DNS** | `list-dns-policies`, `get-dns-policy` |
| **Traffic** | `list-traffic-matching-lists`, `get-traffic-matching-list` |
| **WAN/VPN** | `list-wans`, `list-vpn-tunnels`, `list-vpn-servers` |
| **Reference** | `list-radius-profiles`, `list-device-tags`, `list-dpi-categories`, `list-dpi-applications`, `list-countries` |

## Example Usage

```
"Check all site health"           → list-sites-overview
"Is USM okay?"                    → analyze-site-health { name: "USM" }
"Any reboots in last 3 days?"     → detect-recent-reboots { hours: 72 }
"Who's connected to USS?"         → list-site-clients { name: "USS" }
"Show USM firewall rules"         → list-firewall-policies { name: "USM" }
"What WiFi SSIDs are on USS?"     → list-wifi-broadcasts { name: "USS" }
"Show USV network config"         → list-networks { name: "USV" }
```

## API Key Levels

| Key Type | Base Tools (12) | Connector Tools (33) |
|---|---|---|
| Admin (non-owner) | ✅ | ❌ 403 |
| Owner | ✅ | ✅ |

## Limitations

- **Read-only**: API keys only support read operations
- **Rate limit**: 10,000 requests/min (v1 stable)
- **Cloud Connector**: Partial local API proxy — no event logs, syslog, or detailed stats
