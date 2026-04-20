# UniFi MCP API Coverage Analysis

> Date: 2026-04-20
> Status: In Progress — endpoint paths need verification against official docs

## Current Implementation (v0.3.0)

### Site Manager API — 100% covered
| Endpoint | Tool |
|----------|------|
| GET /v1/hosts | list-hosts |
| GET /v1/hosts/{id} | get-host |
| GET /v1/sites | list-sites |
| GET /v1/devices | list-devices |
| GET /v1/isp-metrics | get-isp-metrics (graceful, 404 possible) |
| POST /v1/isp-metrics/query | query-isp-metrics (graceful, 404 possible) |
| GET /v1/sd-wan-configs | list-sdwan-configs |
| GET /v1/sd-wan-configs/{id} | get-sdwan-config |
| GET /v1/sd-wan-configs/{id}/status | get-sdwan-config-status |

### Cloud Connector — Verified working endpoints
| Integration API Path | Tool | Verified |
|---------------------|------|----------|
| /network/integration/v1/sites | (internal resolver) | ✅ 200 |
| /network/integration/v1/sites/{id}/devices | get-device-details | ✅ 200 |
| /network/integration/v1/sites/{id}/clients | list-site-clients | ✅ 200 |
| /network/integration/v1/sites/{id}/networks | list-networks | ✅ 200 |
| /network/integration/v1/sites/{id}/firewall/policies | list-firewall-policies | ✅ 200 |

### Cloud Connector — Verified NOT working
| Path | Status | Note |
|------|--------|------|
| /network/integration/v1/sites/{id}/wifi | 404 | "wifi" path wrong, try "wifibroadcasts"? |
| /network/integration/v1/events | 404 | events not available via connector |
| /network/integration/v1/alerts | 404 | |
| /network/integration/v1/notifications | 404 | |
| /network/v2/events | 404 | |
| /network/api/s/default/stat/event | 404 | legacy path not proxied |
| /network/api/s/default/stat/syslog | 404 | legacy path not proxied |
| /network/api/s/default/stat/alarm | 200 | but returned empty data |

### Analysis Tools (custom, not API-mapped)
| Tool | Description |
|------|-------------|
| list-sites-overview | Multi-site health dashboard with severity |
| analyze-site-health | Per-site health analysis with reboot detection |
| detect-recent-reboots | Reboot detection across sites (threshold-based) |

## 3-MCP Superset Analysis

### Source repos analyzed
1. **sirkirby/unifi-mcp** — 234 tools (Network 167 + Protect 38 + Access 29)
2. **jmagar/unifi-mcp** — 31 actions (Network only)
3. **enuno/unifi-mcp-server** — 169 tools (Network + Cloud)

### Deduplicated feature categories (read-only operations only)

| Category | sirkirby | jmagar | enuno | Our status |
|----------|----------|--------|-------|------------|
| Sites | ✓ | ✓ | ✓ | ✅ Done |
| Hosts | - | - | ✓ | ✅ Done |
| Devices (list/get) | ✓ | ✓ | ✓ | ✅ Done |
| Clients (list/get) | ✓ | ✓ | ✓ | ✅ Done (connector) |
| Networks (list/get) | ✓ | ✓ | ✓ | ✅ Done (connector) |
| Firewall policies | ✓ | ✓ | ✓ | ✅ Done (connector) |
| SD-WAN | - | - | ✓ | ✅ Done |
| ISP Metrics | - | - | ✓ | ✅ Done (graceful) |
| WiFi/WLAN (list) | ✓ | ✓ | ✓ | ❌ Need endpoint verification |
| Firewall zones | ✓ | - | ✓ | ❌ Need endpoint verification |
| ACL rules | ✓ | - | ✓ | ❌ Need endpoint verification |
| DNS policies | ✓ | - | - | ❌ Need endpoint verification |
| Port forwarding | ✓ | ✓ | ✓ | ❌ Need endpoint verification |
| DPI apps/categories | ✓ | ✓ | ✓ | ❌ Need endpoint verification |
| VPN tunnels/servers | ✓ | - | ✓ | ❌ Need endpoint verification |
| Hotspot/Vouchers | ✓ | ✓ | ✓ | ❌ Need endpoint verification |
| Traffic routes | ✓ | - | ✓ | ❌ Need endpoint verification |
| WAN connections | - | - | ✓ | ❌ Need endpoint verification |
| Switch/Port profiles | ✓ | - | ✓ | ❌ Need endpoint verification |
| RADIUS profiles | ✓ | - | ✓ | ❌ Need endpoint verification |
| Routing/Static routes | ✓ | ✓ | - | ❌ Need endpoint verification |
| Events/Alarms | ✓ | ✓ | - | ❌ Verified NOT working via connector |
| Statistics (detailed) | ✓ | ✓ | ✓ | ❌ Verified NOT working via connector |
| System/Backups | ✓ | - | ✓ | ❌ Likely not available via connector |
| Topology | - | - | ✓ | ❌ Likely not available via connector |

### Coverage estimate
| Metric | Count |
|--------|-------|
| Total read-only categories | ~24 |
| Currently implemented | 8 (33%) |
| Potentially addable (need verification) | ~12 |
| Confirmed impossible (connector limit) | ~4 |
| **Projected after expansion** | **~20 (75-80%)** |

## Next Steps

1. **Verify exact endpoint paths** from official UniFi API docs (developer.ui.com)
   - Network API v10.1.84: all endpoint paths under each category
   - Use Playwright to render React-based docs
2. **Test each endpoint** via Cloud Connector before implementing
3. **Implement verified endpoints** as connector tools

## API Key Permission Matrix

| API Key Type | Site Manager API | Cloud Connector | Write Ops |
|-------------|-----------------|-----------------|-----------|
| Admin (non-owner) | ✅ Full read | ❌ 403 | ❌ View Only |
| Owner | ✅ Full read | ✅ Full read | ❌ View Only |
| Owner (EA + Full Access) | ✅ Full | ✅ Full | ⚠ TBD |

Note: API key permissions inherit from user role (Owner > Super Admin > Site Admin > Read Only)

## Architecture Constraints

- Cloud Connector = **partial** local API proxy
- Integration API paths work (`/network/integration/v1/*`)
- Legacy API paths return 404 (`/api/s/{site}/stat/*`)
- Event logs, syslog, detailed stats NOT accessible via connector
- All operations are read-only (API key limitation)
