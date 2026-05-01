# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-05-01

### Added

- **`summarize-site` aggregation tool** — devices + WAN status + (opt) clients + networks + WiFi broadcasts in a single call. Replaces 4-5 round-trips. Connector-dependent fields auto-skip when owner key absent.

## [1.3.0] - 2026-05-01

### Added

- **MCP Resources (`unifi://` URI scheme)** — 3 resource templates: `unifi://site/{name}`, `unifi://devices`, `unifi://hosts`.

## [1.2.2] - 2026-05-01

### Added

- `pnpm token-stats` script + CI regression guard with `TOKEN_BUDGET=6500`.

## [1.2.1] - 2026-05-01

### Added

- **`extractFields` auto-apply** via `wrapToolHandler`. Schema field declared on `analysis` and `analytics` tools.

## [1.2.0] - 2026-05-01

### Added

- **Token efficiency standard** (cross-repo with openmetadata-mcp v1.3.0, datadog-mcp v1.9.0):
  - `UNIFI_TOOLS` / `UNIFI_DISABLE` env vars: 8 categories (analysis, raw, devices, clients, networks, firewall, wan, reference).
  - `search-tools` meta-tool.
  - `extractFields` helper in `src/tools/extract-fields.ts`.
- `tests/extract-fields.test.ts` (3 cases), `tests/tool-registry.test.ts` (4 cases) — first tests in this repo.

## [1.1.0] - 2026-05-01

### Added

- **Semantic analysis library pivot** — README repositioned from "raw API wrapper" to "judgments + curated thresholds".
- 4 cross-site analytics tools: `compare-sites`, `firmware-inventory`, `wan-uptime-trend`, `top-clients-by-bandwidth`.

### Changed

- Total tools: 47 → 51.

## [1.0.1] - 2026-04-20

### Fixed

- npm publish workflow Node 22 → 24 to avoid `promise-retry` MODULE_NOT_FOUND on `npm install -g npm@latest`.

## [1.0.0] - 2026-04-20

### Added

- Initial release with **45 tools** covering UniFi Network read-only API.
- 3 semantic analysis tools (`list-sites-overview`, `analyze-site-health`, `detect-recent-reboots`) with severity classification.
- 9 raw Site Manager API tools (hosts, sites, devices, isp-metrics, sd-wan).
- 33 Cloud Connector proxy tools (devices, clients, networks, WiFi, vouchers, firewall, ACL, DNS, traffic, WAN, VPN, RADIUS, DPI, reference data).
- Dual API key routing: `UNIFI_API_KEY` (Site Manager) + `UNIFI_API_KEY_OWNER` (Cloud Connector).
- Exponential backoff retry with jitter (max 3 attempts, 1s/2s/4s + 0~300ms jitter).
- Read-only — no mutation operations (Ubiquiti GA limitation).
