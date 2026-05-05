# UniFi MCP Server

> **The MSP-style UniFi MCP — built around the official Site Manager API + Cloud Connector with cross-site analytics no other UniFi MCP exposes.**
>
> 51 tools split across 7 semantic-analysis aggregations, 9 raw Site Manager, and 35 Cloud Connector. Severity verdicts (`healthy`/`info`/`warning`/`critical`) on top of curated thresholds. 4 MCP Prompts for fleet-wide ops. Read-only — Ubiquiti's API keys don't ship write yet.

[![npm](https://img.shields.io/npm/v/@us-all/unifi-mcp)](https://www.npmjs.com/package/@us-all/unifi-mcp)
[![downloads](https://img.shields.io/npm/dm/@us-all/unifi-mcp)](https://www.npmjs.com/package/@us-all/unifi-mcp)
[![tools](https://img.shields.io/badge/tools-54-blue)](#tools)
[![@us-all standard](https://img.shields.io/badge/built%20to-%40us--all%20MCP%20standard-blue)](https://github.com/us-all/mcp-toolkit/blob/main/STANDARD.md)

## What it does that others don't

- **Site Manager analytics** — `site-health-timeline`, `summarize-site`, `firmware-inventory`, `compare-sites`, `wan-uptime-trend`, `top-clients-by-bandwidth`, `list-sites-overview`. No other UniFi MCP exposes these.
- **Severity verdicts**, not just numbers — every analysis tool returns `healthy / info / warning / critical / unknown` with a curated reason. Curated thresholds (e.g. WAN uptime <90% = `critical`, startupTime <1h = `critical` post-reboot).
- **Cloud Connector first-class** — 35 tools through the official `/v1/connector/consoles/{id}/...` proxy. `connectorAvailable` (capability) vs `connectorResolved` (this-call) split.
- **Aggregation tools** — fold 3–7 sequential calls into 1 with `caveats` array surfacing partial failures (e.g. Site Manager API can't window-bound WAN uptime — that's surfaced explicitly).
- **MCP Prompts** (4) — `triage-site-degradation`, `firmware-rollout-audit`, `wan-uptime-report`, `cross-site-anomaly-detection`.
- **Token-efficient by design** — smallest schema footprint of all `@us-all/*` MCPs (default ~5K tokens with owner key). Fleet of 200+ devices analyzable inside a single session.
- **Apps SDK card** — `summarize-site` renders as a fleet-status card on ChatGPT clients (online %, WAN uptime, gateway, devices) via `_meta["openai/outputTemplate"]`. Claude clients receive the same JSON content.
- **stdio + Streamable HTTP** — defaults to stdio. Set `MCP_TRANSPORT=http` for ChatGPT Apps SDK or remote clients (Bearer auth via `MCP_HTTP_TOKEN`).

## Try this — 5 prompts

Connect the server to Claude Desktop or Claude Code, then paste any of these:

1. **MSP morning check** — *"Fleet health check across all my UniFi sites. Flag anything not `healthy` with severity, top 3 issues."*
2. **Firmware rollout audit** — *"Find devices on outdated firmware across every site. Group by site, show current vs latest version, prioritize by criticality."*
3. **Site degradation triage** — *"USM site has WiFi complaints. Pull the last 24h: device statuses, WAN uptime, recent reboots, top-bandwidth clients. Anything anomalous?"*
4. **WAN SLA report** — *"Generate a monthly WAN uptime report for all sites. Surface outages > 5 minutes, dual-WAN failover events, sites below 99.5% target."*
5. **Cross-site anomaly** — *"Compare USS to my other sites — clients per AP, traffic patterns, device firmware mix. Flag outliers and suggest the most likely cause."*

## When to use this vs other UniFi MCPs

| | sirkirby/unifi-mcp | enuno/unifi-mcp-server | `@us-all/unifi-mcp` (this) |
|--|---|---|---|
| GitHub stars | 291 | 117 | — |
| Tool count | 224 | 74 | **51** |
| Scope | Network + Protect + Access + Drive | Network + multi-site + QoS + backup | Site Manager + Cloud Connector + analytics |
| Site Manager API | ❌ | partial | ✅ deep + analytics |
| Cloud Connector | ❌ | partial (3 modes) | ✅ avail/resolved split |
| UniFi Protect (cameras) | ✅ | ❌ | ❌ (out of scope) |
| UniFi Access (doors) | ✅ | ❌ | ❌ (out of scope) |
| Aggregation tools | ❌ | ❌ | ✅ 7 |
| Severity verdicts | ❌ | ❌ | ✅ curated thresholds |
| MCP Prompts | ❌ | ❌ | ✅ 4 |

Use **sirkirby** when you need cameras (Protect) or door access. Use **enuno** if you want raw Network API breadth. Use **this server** for MSP-style multi-site analytics, fleet triage, and any "is something off?" question across many consoles.

## Install

### Claude Desktop

```json
{
  "mcpServers": {
    "unifi": {
      "command": "npx",
      "args": ["-y", "@us-all/unifi-mcp"],
      "env": {
        "UNIFI_API_KEY": "<your-key>",
        "UNIFI_API_KEY_OWNER": "<owner-key-or-same-key-if-role=owner>"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add unifi -s user \
  -e UNIFI_API_KEY=<your-key> \
  -e UNIFI_API_KEY_OWNER=<owner-key> \
  -- npx -y @us-all/unifi-mcp
```

### Build from source

```bash
git clone https://github.com/us-all/unifi-mcp-server.git
cd unifi-mcp-server && pnpm install && pnpm build
node dist/index.js
```

## API keys — which one and where

The most common onboarding friction. UniFi has **two surfaces** through the same `https://api.ui.com/v1`:

| Surface | What it gives | Path | Env var |
|---|---|---|---|
| **Site Manager** | hosts, sites, devices summary, ISP metrics, SD-WAN configs (aggregated, console-wide) | `/v1/hosts`, `/v1/sites`, `/v1/devices`, `/v1/sd-wan-configs` | `UNIFI_API_KEY` |
| **Cloud Connector** | per-device, per-client, networks, firewall, WiFi (proxies to local controller) | `/v1/connector/consoles/{hostId}/...` | `UNIFI_API_KEY_OWNER` |

API key permissions inherit from the role of the account that created them.

| Account role | Site Manager | Cloud Connector |
|---|---|---|
| Admin (non-owner) | ✅ | ❌ 403 |
| **Owner** | ✅ | ✅ |

**If you have the owner role, set both env vars to the same key.** That's the most common case for `@us-all` operators.

Get the key: [unifi.ui.com](https://unifi.ui.com) → Settings → API → Generate. **View Only** is the only option in GA today (Full Access greyed out — Early Access program needed for write).

### Cloud Connector requirements

- Console firmware ≥ 5.0.3
- API path: `https://api.ui.com/v1/connector/consoles/{hostId}/{appPath}`
- Local `siteId` is a UUID, not the literal string `default`
- Available endpoints: Network integration API (`/network/integration/v1/sites`, devices, clients, networks). Legacy paths (`/api/s/{site}/stat/event`) return 404. Event logs / syslog not exposed.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `UNIFI_API_KEY` | ✅ | — | API key from unifi.ui.com (any admin role) |
| `UNIFI_API_KEY_OWNER` | ❌ | — | Owner-role API key — enables 35 Cloud Connector tools. If your key has owner role, set this to the same value. |
| `UNIFI_API_URL` | ❌ | `https://api.ui.com/v1` | API base URL |
| `UNIFI_TOOLS` | ❌ | — | Comma-sep allowlist of categories. |
| `UNIFI_DISABLE` | ❌ | — | Comma-sep denylist. Ignored when `UNIFI_TOOLS` is set. |
| `MCP_TRANSPORT` | ❌ | `stdio` | `http` to enable Streamable HTTP transport |
| `MCP_HTTP_TOKEN` | conditional | — | Bearer token. Required when `MCP_TRANSPORT=http` |
| `MCP_HTTP_PORT` | ❌ | `3000` | HTTP listen port |
| `MCP_HTTP_HOST` | ❌ | `127.0.0.1` | HTTP bind host (DNS rebinding protection auto-enabled for localhost) |
| `MCP_HTTP_SKIP_AUTH` | ❌ | `false` | Skip Bearer auth — e.g. behind a reverse proxy that handles it |

**Categories** (8): `analysis`, `raw`, `devices`, `clients`, `networks`, `firewall`, `wan`, `reference`.

When `MCP_TRANSPORT=http`: `POST /mcp` (Bearer-auth JSON-RPC) + `GET /health` (public liveness).

### Token efficiency

Smallest schema footprint of all `@us-all/*` MCPs.

| Scenario | Tools | Schema tokens |
|----------|------:|--------------:|
| default no-owner | 17 | 1,700 |
| `UNIFI_TOOLS=analysis` | 8 | **1,000** (−42%) |
| default with owner key | 52 | ~5,000 |
| `UNIFI_TOOLS=analysis` + owner | 8 | **1,000** (−80%) |

## Severity & thresholds

Every analysis tool returns one of:
- `healthy` — no issues
- `info` — informational, no action
- `warning` — needs attention
- `critical` — immediate action
- `unknown` — API failure or incomplete data

Curated thresholds:

| Condition | Severity |
|---|---|
| Device offline | `critical` |
| `startupTime < 1h` | `critical` (just rebooted) |
| `startupTime < 24h` | `warning` (recent reboot) |
| `startupTime < 72h` | `info` (monitor) |
| WAN uptime < 90% | `critical` |
| WAN uptime < 95% | `warning` |

## MCP Prompts (4)

Workflow templates available via MCP `prompts/list`:

- `triage-site-degradation` — site complaints workflow: device + WAN + reboots + clients in sequence.
- `firmware-rollout-audit` — fleet-wide firmware diff and rollout safety check.
- `wan-uptime-report` — monthly WAN SLA-style report across sites.
- `cross-site-anomaly-detection` — compare a site to fleet baseline; flag outliers.

## MCP Resources

- `unifi://site/{hostName}/devices` — site's devices snapshot
- `unifi://reboots/recent` — recently rebooted devices fleet-wide

## Tools (54)

8 categories. Use `search-tools` to discover at runtime; full list collapsed below. Cloud Connector tools (33) only register when `UNIFI_API_KEY_OWNER` is set; without it the surface is 21 tools.

| Group | Tools |
|-------|------:|
| Semantic analysis (incl. aggregations) | 9 |
| Site Manager raw | 9 |
| Cloud Connector (devices/clients/networks/wifi/firewall/wan/reference) | 33 |
| Sites local (`list-local-sites`, `get-app-info`) | 2 |
| Meta (`search-tools`) | 1 |

<details>
<summary>Full tool list</summary>

### Semantic analysis (9)
`list-sites-overview`, `analyze-site-health`, `detect-recent-reboots`, `compare-sites`, `firmware-inventory`, `wan-uptime-trend`, `top-clients-by-bandwidth`, `summarize-site` *(aggregation)*, `site-health-timeline` *(aggregation)*

### Site Manager API (9)
`list-hosts`, `get-host`, `list-sites`, `list-devices`, `get-isp-metrics` (optional), `query-isp-metrics` (optional), `list-sdwan-configs`, `get-sdwan-config`, `get-sdwan-config-status`

### Cloud Connector — devices (4)
`get-device-details`, `get-device-by-id`, `get-device-statistics`, `list-pending-devices`

### Cloud Connector — clients (2)
`list-site-clients`, `get-client-details`

### Cloud Connector — networks (3)
`list-networks`, `get-network-details`, `get-network-references`

### Cloud Connector — WiFi (2)
`list-wifi-broadcasts`, `get-wifi-broadcast-details`

### Cloud Connector — firewall / ACL / DNS (10)
`list-firewall-zones`, `get-firewall-zone`, `list-firewall-policies`, `get-firewall-policy`, `get-firewall-policy-ordering`, `list-acl-rules`, `get-acl-rule`, `get-acl-rule-ordering`, `list-dns-policies`, `get-dns-policy`

### Cloud Connector — traffic / WAN / VPN (5)
`list-traffic-matching-lists`, `get-traffic-matching-list`, `list-wans`, `list-vpn-tunnels`, `list-vpn-servers`

### Cloud Connector — hotspot / reference (7)
`list-vouchers`, `get-voucher-details`, `list-radius-profiles`, `list-device-tags`, `list-dpi-categories`, `list-dpi-applications`, `list-countries`

### Sites local (2)
`list-local-sites`, `get-app-info`

### Meta
`search-tools` — query other tools by keyword; always enabled.

</details>

## Architecture

```
Claude → MCP stdio → src/index.ts
                      ├── tools/analysis.ts → Site Manager API (UNIFI_API_KEY)
                      ├── tools/*.ts (raw)   → Site Manager API (UNIFI_API_KEY)
                      └── tools/connector.ts → Cloud Connector  (UNIFI_API_KEY_OWNER)
                      helpers/resolver.ts    → hostName ↔ ID mapping
```

Built on [`@us-all/mcp-toolkit`](https://github.com/us-all/mcp-toolkit):
- `extractFields` — token-efficient response projections
- `aggregate(fetchers, caveats)` — fan-out helper for `summarize-site` / `site-health-timeline`
- `createWrapToolHandler` — `X-API-KEY` redaction + `ConnectorError`/`UniFiError` extraction
- Retry: 3 attempts, exponential backoff (1s → 2s → 4s) + jitter, 30s Cloud Connector timeout

## Limitations

- **Read-only** — UniFi API keys don't support write yet (Full Access role greyed out in GA).
- **Rate limit** — 10,000 req/min on stable v1; 100 req/min on Early Access.
- **Cloud Connector partial proxy** — Network integration API works; legacy paths return 404; event logs/syslog not exposed.
- **ISP Metrics** — may return 404 depending on account/plan.

## Tech stack

Node.js 18+ • TypeScript strict ESM • pnpm • `@modelcontextprotocol/sdk` • zod v4 • dotenv.

## License

[MIT](./LICENSE)
