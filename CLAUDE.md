# CLAUDE.md

## Project Overview
UniFi Cloud API MCP server — semantic analysis tools + Cloud Connector integration for network infrastructure monitoring.
Read-only access via official UniFi Site Manager API and Cloud Connector proxy.

## Tech Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Package Manager**: pnpm
- **MCP SDK**: `@modelcontextprotocol/sdk` (^1.27.1)
- **Validation**: zod v4
- **Config**: dotenv

## Build & Run Commands
```bash
pnpm install
pnpm run build
pnpm run smoke     # Live API smoke test
node dist/index.js # Start server
```

## Architecture
```
Claude → MCP (stdio) → index.ts
                        ├── tools/analysis.ts   → Site Manager API (UNIFI_API_KEY)
                        ├── tools/*.ts (raw)     → Site Manager API (UNIFI_API_KEY)
                        └── tools/connector.ts   → Cloud Connector  (UNIFI_API_KEY_OWNER)
                        helpers/resolver.ts      → hostName ↔ ID mapping
```

### Layers
- **Analysis tools** (`tools/analysis.ts`): Semantic tools returning judgments (status/summary/issues)
- **Connector tools** (`tools/connector.ts`): Cloud Connector proxy to local APIs (requires owner key)
- **Raw tools** (`tools/hosts.ts`, `sites.ts`, etc.): Direct Site Manager API wrappers
- **Helpers** (`helpers/resolver.ts`): hostName ↔ hostId/siteId resolution

### Key Source Files
- `src/index.ts` — Entry point, 12 base + 33 connector = 45 tools
- `src/config.ts` — Dual key config + `isConnectorAvailable()`
- `src/client.ts` — Site Manager API client (X-API-KEY, retry)
- `src/connector-client.ts` — Cloud Connector client (owner key, retry, 30s timeout)
- `src/retry.ts` — withRetry: exponential backoff + jitter (429, 5xx, AbortError, network)
- `src/tools/utils.ts` — wrapToolHandler, error sanitization
- `src/tools/analysis.ts` — 3 semantic analysis tools
- `src/tools/connector.ts` — 33 Cloud Connector tools (siteGet/hostGet helpers)
- `src/helpers/resolver.ts` — hostName → hostId/siteId + ConnectorContext

### Key Routing
- `client.ts` uses `UNIFI_API_KEY` — Site Manager API only
- `connector-client.ts` uses `UNIFI_API_KEY_OWNER` — Cloud Connector only
- Never mixed. Connector tools auto-disabled when owner key not set.

### Tool Pattern
Each tool file exports:
1. Zod schema with `.describe()` on all fields
2. Async handler function
3. Schema is registered in index.ts with `wrapToolHandler(handler)`

### Severity System
- `healthy` — no issues
- `info` — informational (no action needed)
- `warning` — needs attention
- `critical` — immediate action required
- `unknown` — API failure or incomplete data

### Anomaly Detection Thresholds
- Device offline → `critical`
- startupTime < 1h → `critical` (just rebooted)
- startupTime < 24h → `warning` (recent reboot)
- startupTime < 72h → `info` (monitor)
- WAN uptime < 90% → `critical`
- WAN uptime < 95% → `warning`

## Environment Variables
- `UNIFI_API_KEY` (required) — API key from unifi.ui.com (any admin)
- `UNIFI_API_KEY_OWNER` (optional) — Owner account API key for Cloud Connector
- `UNIFI_API_URL` (optional) — defaults to `https://api.ui.com/v1`

## API Key Permission Levels

API key permissions inherit from the user role of the account that created them.

### Non-owner key (admin account)
- **Site Manager API**: Full access (`/v1/hosts`, `/v1/sites`, `/v1/devices`, `/v1/sd-wan-configs`)
- **Cloud Connector**: **403 Forbidden** (`insufficient permissions for this host`)
- **ISP Metrics**: May return 404 (account/plan dependent)
- **Scope**: Read-only aggregated data only

### Owner key (console owner account)
- **Site Manager API**: Full access (same as above)
- **Cloud Connector**: **Full access** (`/v1/connector/consoles/{id}/*path`)
  - Proxies to local controller at `http://127.0.0.1/proxy/[path]`
  - Network integration API: `/network/integration/v1/sites`, devices, clients, networks
  - Protect integration API: cameras, NVR, events
- **Scope**: Read-only, but can access detailed per-device/per-client data

### Key requirements for Cloud Connector
- Console firmware >= 5.0.3
- Non-owner keys: limited to key owner's consoles only
- Owner keys: can access all consoles in the organization
- API path format: `https://api.ui.com/v1/connector/consoles/{hostId}/{appPath}`
- Local siteId (UUID) required, not "default" string

### UniFi role hierarchy
- Owner → Super Admin → Site Admin → Read Only
- API key inherits permissions of the creating user's role

### Permissions at key creation
- **View Only**: Read-only access (currently the only option in GA)
- **Full Access**: Greyed out in GA UI — may require Early Access program

## Constraints
- API key is **read-only** (Ubiquiti limitation — "Full Access" not yet available in GA)
- Rate limit: 10,000 req/min (stable v1), 100 req/min (EA)
- No write/mutation operations available
- ISP metrics endpoint may return 404 (account-dependent)
- Cloud Connector is a **partial** local API proxy — not all endpoints available
  - Integration API paths work (`/network/integration/v1/*`)
  - Legacy API paths return 404 (`/api/s/{site}/stat/event`)
  - Event logs and syslog not accessible via connector

## Retry & Resilience
- Retry: max 3 attempts with exponential backoff (1s → 2s → 4s) + random jitter (0~300ms)
- Retryable errors: 429 (rate limit), 5xx (server error), AbortError (timeout), network errors
- Cloud Connector timeout: 30 seconds (AbortSignal.timeout)
- Non-retryable errors (4xx except 429) fail immediately

### 최근 변경사항
- **v1.8.4** (2026-05-03): `@us-all/mcp-toolkit ^1.1.0` 채택 + `aggregate()` 헬퍼로 두 어그리게이션 도구(`summarize-site`, `site-health-timeline`) 마이그레이션. `summarize-site`는 이전엔 caveats 노출 없었음 — 추가됨.
- **v1.8.3** (2026-05-03): `@us-all/mcp-toolkit ^1.0.0` 핀 업데이트. toolkit API freeze (semver 1.x 보장 시작) — 코드 변경 0줄, 3/3 테스트 통과.
- **v1.8.2** (2026-05-03): `summarize-site`가 device 객체에서 uidb 노이즈 드롭 (default-slim).
- **v1.8.1** (2026-05-03): 수동 검증 발견 버그 2개 패치 — `top-clients-by-bandwidth`가 `type:"WIRED"`와 `isWired:false`를 동시에 반환하던 문제 (UniFi connector API는 type discriminator만 노출 → boolean 미존재 시 `type.toUpperCase()==="WIRED"`에서 파생). `summarize-site`의 `connectorAvailable`을 capability(owner-key 보유)와 `connectorResolved`(this-call resolved)로 분리.
- **v1.8.0** (2026-05-02): `site-health-timeline` 어그리게이션 — devices + WAN + reboots + clients 1 call. Site Manager API 한계(WAN window-bound 불가, reboots/device max 1)는 caveats에 명시.
- **v1.7.0** (2026-05-02): Wave 3 Resources — `unifi://site/{hostName}/devices`, `unifi://reboots/recent`.
- **v1.6.0** (2026-05-02): MCP Prompts 4개 — `triage-site-degradation`, `firmware-rollout-audit`, `wan-uptime-report`, `cross-site-anomaly-detection`.
- **v1.5.2** (2026-05-02): Wave 1 — 의존성 bumps + default projections (describe trim 0건, 이미 lean).
- **v1.5.1** (2026-05-02): `@us-all/mcp-toolkit ^0.2.0` 채택 — 로컬 `sanitize` / `wrapToolHandler` 본문 제거, `createWrapToolHandler` factory로 위임. `redactionPatterns: [/X-API-KEY/i]` + `errorExtractors`(ConnectorUnavailableError → raw passthrough, ConnectorError·UniFiError → structured)만 명시. utils.ts 59→37 lines.
- **v1.5.0** (2026-05-01): `@us-all/mcp-toolkit ^0.1.0` 마이그레이션 — tool-registry/extract-fields toolkit 위임. 약 175 lines 절감.
- **v1.4.0**: `summarize-site` 어그리게이션 도구 — devices + WAN + (opt) clients/networks/wifi 1 call로 통합.
- **v1.3.0**: MCP Resources (`unifi://` URI) — site, devices, hosts.
- **v1.2.2**: `pnpm token-stats` + CI TOKEN_BUDGET=6500.
- **v1.2.1**: `extractFields` auto-apply via wrapToolHandler. analysis/analytics 스키마에 명시적 선언.
- **v1.2.0**: 토큰 효율 표준 (UNIFI_TOOLS / UNIFI_DISABLE 8 카테고리 + search-tools 메타툴 + extractFields 헬퍼).
- **v1.1.0**: 시맨틱 분석 라이브러리 포지셔닝. 분석 도구 4개 추가 (compare-sites, firmware-inventory, wan-uptime-trend, top-clients-by-bandwidth). 도구 47→51.

### 이전 변경사항 (2026-04-20)
- v1.0.0 초기 릴리즈
- Site Manager API 9개 엔드포인트 100% 커버
- Network API read-only 37개 엔드포인트 → 33개 connector 도구로 구현
- 시맨틱 분석 도구 3개 (site health, reboot detection, overview)
- 이중 키 라우팅 (admin key / owner key)
- retry with backoff + jitter, connector timeout 30s
