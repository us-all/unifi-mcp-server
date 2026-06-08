/**
 * Pre-flight diagnostic for the UniFi MCP server.
 *
 * Run via `unifi-mcp --doctor` (or `npx @us-all/unifi-mcp --doctor`). Reports env-var
 * presence, Site Manager API reachability, Cloud Connector probe (if owner key set),
 * and category toggles. Returns exit code 0 on healthy, 1 on critical failure.
 */

const TIMEOUT_MS = 10_000;

type Status = "ok" | "warn" | "fail" | "skip";

interface Check {
  name: string;
  status: Status;
  detail: string;
}

const ICON: Record<Status, string> = {
  ok: "✅",
  warn: "⚠️ ",
  fail: "❌",
  skip: "⏭️ ",
};

interface DoctorEnv {
  UNIFI_API_KEY?: string;
  UNIFI_API_KEY_OWNER?: string;
  UNIFI_API_URL?: string;
  UNIFI_TOOLS?: string;
  UNIFI_DISABLE?: string;
  UNIFI_LOCAL_URL?: string;
  UNIFI_LOCAL_USER?: string;
  UNIFI_LOCAL_PASS?: string;
  UNIFI_LOCAL_SITE?: string;
  UNIFI_LOCAL_INSECURE?: string;
}

interface DoctorOptions {
  fetchImpl?: typeof fetch;
  env?: DoctorEnv;
  log?: (line: string) => void;
}

export interface DoctorResult {
  checks: Check[];
  exitCode: 0 | 1;
}

async function pingUrl(
  url: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<{ status: number; ms: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { "X-API-KEY": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { status: res.status, ms: Date.now() - start };
  } catch (err) {
    return {
      status: 0,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeLocalLogin(
  baseUrl: string,
  user: string,
  pass: string,
  insecure: boolean,
  _fetchImpl: typeof fetch,
): Promise<{ status: number; ms: number; error?: string }> {
  // Lazy import undici so doctor doesn't pull it unless local probe runs.
  const start = Date.now();
  try {
    const { Agent, fetch: undiciFetch } = await import("undici");
    const dispatcher = insecure ? new Agent({ connect: { rejectUnauthorized: false } }) : undefined;
    const res = await undiciFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      dispatcher,
    });
    return { status: res.status, ms: Date.now() - start };
  } catch (err) {
    return {
      status: 0,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runDoctor(opts: DoctorOptions = {}): Promise<DoctorResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const env = opts.env ?? (process.env as DoctorEnv);
  const log = opts.log ?? ((line: string) => console.log(line));

  const apiKey = env.UNIFI_API_KEY ?? "";
  const ownerKey = env.UNIFI_API_KEY_OWNER ?? "";
  const baseUrl = (env.UNIFI_API_URL ?? "https://api.ui.com/v1").replace(/\/+$/, "");
  const toolsEnv = env.UNIFI_TOOLS;
  const disableEnv = env.UNIFI_DISABLE;
  const localUrl = (env.UNIFI_LOCAL_URL ?? "").replace(/\/+$/, "");
  const localUser = env.UNIFI_LOCAL_USER ?? "";
  const localPass = env.UNIFI_LOCAL_PASS ?? "";
  const localInsecure = ["1", "true", "yes", "on"].includes((env.UNIFI_LOCAL_INSECURE ?? "").toLowerCase());

  const checks: Check[] = [];

  // 1. UNIFI_API_KEY presence + basic shape
  if (!apiKey) {
    checks.push({
      name: "UNIFI_API_KEY",
      status: "fail",
      detail: "not set — get one from https://unifi.ui.com (account → API → Create API Key)",
    });
  } else if (apiKey.length < 20) {
    checks.push({
      name: "UNIFI_API_KEY",
      status: "warn",
      detail: `set (${apiKey.length} chars) — typical keys are >= 32 chars; verify it's complete`,
    });
  } else {
    checks.push({ name: "UNIFI_API_KEY", status: "ok", detail: `set (${apiKey.length} chars)` });
  }

  // 2. Owner key (Cloud Connector enablement)
  if (ownerKey) {
    checks.push({
      name: "UNIFI_API_KEY_OWNER",
      status: "ok",
      detail: `set (${ownerKey.length} chars) — Cloud Connector tools enabled`,
    });
  } else {
    checks.push({
      name: "UNIFI_API_KEY_OWNER",
      status: "warn",
      detail: "not set — Cloud Connector tools (deep per-device data) will not register",
    });
  }

  // 3. Base URL
  checks.push({ name: "UNIFI_API_URL", status: "ok", detail: baseUrl });

  // 4. Site Manager API ping
  if (!apiKey) {
    checks.push({ name: "Site Manager API ping", status: "skip", detail: "no API key" });
  } else {
    const result = await pingUrl(`${baseUrl}/hosts`, apiKey, fetchImpl);
    if (result.status === 200) {
      checks.push({
        name: "Site Manager API ping",
        status: "ok",
        detail: `200 OK (${result.ms}ms) — /hosts reachable`,
      });
    } else if (result.status === 401 || result.status === 403) {
      checks.push({
        name: "Site Manager API ping",
        status: "fail",
        detail: `${result.status} — API key rejected. Check key value and account permissions.`,
      });
    } else if (result.status === 0) {
      checks.push({
        name: "Site Manager API ping",
        status: "fail",
        detail: `network error (${result.ms}ms): ${result.error ?? "unknown"}`,
      });
    } else {
      checks.push({
        name: "Site Manager API ping",
        status: "warn",
        detail: `unexpected ${result.status} (${result.ms}ms) — may still work, but worth checking`,
      });
    }
  }

  // 5. Cloud Connector probe (only if owner key set)
  if (!ownerKey) {
    checks.push({
      name: "Cloud Connector probe",
      status: "skip",
      detail: "no owner key (UNIFI_API_KEY_OWNER not set)",
    });
  } else if (!apiKey) {
    checks.push({ name: "Cloud Connector probe", status: "skip", detail: "no API key" });
  } else {
    // /hosts with owner key is the cheapest way to verify the owner key is also valid.
    // The actual /connector/consoles/{id}/* endpoints require a host ID we don't have.
    const result = await pingUrl(`${baseUrl}/hosts`, ownerKey, fetchImpl);
    if (result.status === 200) {
      checks.push({
        name: "Cloud Connector probe",
        status: "ok",
        detail: `owner key verified (${result.ms}ms) — connector endpoints reachable`,
      });
    } else if (result.status === 401 || result.status === 403) {
      checks.push({
        name: "Cloud Connector probe",
        status: "fail",
        detail: `${result.status} — owner key rejected. Owner-account console requires firmware >= 5.0.3.`,
      });
    } else {
      checks.push({
        name: "Cloud Connector probe",
        status: "warn",
        detail: `unexpected ${result.status} (${result.ms}ms)`,
      });
    }
  }

  // 6. Local controller probe (only if local URL/user/pass set)
  if (!localUrl) {
    checks.push({
      name: "Local controller probe",
      status: "skip",
      detail: "no UNIFI_LOCAL_URL set — local-only tools (port errors, flap events) will not register",
    });
  } else if (!localUser || !localPass) {
    checks.push({
      name: "Local controller probe",
      status: "fail",
      detail: "UNIFI_LOCAL_URL set but UNIFI_LOCAL_USER or UNIFI_LOCAL_PASS missing",
    });
  } else {
    const result = await probeLocalLogin(localUrl, localUser, localPass, localInsecure, fetchImpl);
    if (result.status === 200) {
      checks.push({
        name: "Local controller probe",
        status: "ok",
        detail: `login ok (${result.ms}ms) — port-level tools enabled${localInsecure ? " (insecure TLS allowed)" : ""}`,
      });
    } else if (result.status === 400 || result.status === 401 || result.status === 403) {
      checks.push({
        name: "Local controller probe",
        status: "fail",
        detail: `${result.status} — credentials rejected. Verify UNIFI_LOCAL_USER/PASS.`,
      });
    } else if (result.status === 0) {
      checks.push({
        name: "Local controller probe",
        status: "fail",
        detail: `unreachable (${result.ms}ms): ${result.error ?? "unknown"}${result.error?.includes("self") || result.error?.includes("certificate") ? " — try UNIFI_LOCAL_INSECURE=true for UDM self-signed cert" : ""}`,
      });
    } else {
      checks.push({
        name: "Local controller probe",
        status: "warn",
        detail: `unexpected ${result.status} (${result.ms}ms)`,
      });
    }
  }

  // 7. Category toggles
  if (toolsEnv) {
    checks.push({
      name: "UNIFI_TOOLS",
      status: "ok",
      detail: `${toolsEnv} — only listed categories load`,
    });
  } else {
    checks.push({ name: "UNIFI_TOOLS", status: "ok", detail: "not set (all categories enabled)" });
  }
  if (disableEnv) {
    checks.push({
      name: "UNIFI_DISABLE",
      status: "ok",
      detail: `${disableEnv} — listed categories blocked`,
    });
  }

  // Render
  log("UniFi MCP Server — Doctor");
  log("=========================");
  log("");
  for (const c of checks) {
    log(`  ${ICON[c.status]} ${c.name.padEnd(28)} ${c.detail}`);
  }
  log("");

  const failed = checks.some((c) => c.status === "fail");
  const warned = checks.some((c) => c.status === "warn");
  if (failed) {
    log("Result: ❌ Critical issue — server will not start. Fix the failing check(s) above.");
  } else if (warned) {
    log("Result: ⚠️  Server should start, but reduced functionality. See warnings above.");
  } else {
    log("Result: ✅ Healthy — server should start cleanly.");
  }

  return { checks, exitCode: failed ? 1 : 0 };
}
