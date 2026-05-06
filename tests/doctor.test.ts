import { describe, it, expect, vi } from "vitest";
import { runDoctor, type DoctorResult } from "../src/doctor.js";

function makeFetch(status: number, body: unknown = {}): typeof fetch {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
}

function makeFailingFetch(error: string): typeof fetch {
  return vi.fn(async () => {
    throw new Error(error);
  }) as unknown as typeof fetch;
}

function captureLogs(): { log: (line: string) => void; lines: string[] } {
  const lines: string[] = [];
  return { log: (line: string) => lines.push(line), lines };
}

function check(result: DoctorResult, name: string) {
  const c = result.checks.find((x) => x.name === name);
  if (!c) throw new Error(`Check "${name}" not found in result`);
  return c;
}

describe("runDoctor", () => {
  it("fails when UNIFI_API_KEY is missing", async () => {
    const { log } = captureLogs();
    const result = await runDoctor({
      env: {},
      fetchImpl: makeFetch(200),
      log,
    });
    expect(check(result, "UNIFI_API_KEY").status).toBe("fail");
    expect(check(result, "Site Manager API ping").status).toBe("skip");
    expect(result.exitCode).toBe(1);
  });

  it("passes when API key valid and ping returns 200", async () => {
    const { log } = captureLogs();
    const result = await runDoctor({
      env: { UNIFI_API_KEY: "x".repeat(40) },
      fetchImpl: makeFetch(200),
      log,
    });
    expect(check(result, "UNIFI_API_KEY").status).toBe("ok");
    expect(check(result, "Site Manager API ping").status).toBe("ok");
    // No owner key → connector skipped, but that's "warn" on the env var, not "fail"
    expect(check(result, "UNIFI_API_KEY_OWNER").status).toBe("warn");
    expect(result.exitCode).toBe(0);
  });

  it("flags 401 as fail (rejected key)", async () => {
    const { log } = captureLogs();
    const result = await runDoctor({
      env: { UNIFI_API_KEY: "x".repeat(40) },
      fetchImpl: makeFetch(401),
      log,
    });
    expect(check(result, "Site Manager API ping").status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("warns on short API keys", async () => {
    const { log } = captureLogs();
    const result = await runDoctor({
      env: { UNIFI_API_KEY: "tooshort" },
      fetchImpl: makeFetch(200),
      log,
    });
    expect(check(result, "UNIFI_API_KEY").status).toBe("warn");
    // Short key still passes ping mock — overall not a critical fail
    expect(result.exitCode).toBe(0);
  });

  it("flags network error as fail", async () => {
    const { log } = captureLogs();
    const result = await runDoctor({
      env: { UNIFI_API_KEY: "x".repeat(40) },
      fetchImpl: makeFailingFetch("ENOTFOUND api.ui.com"),
      log,
    });
    expect(check(result, "Site Manager API ping").status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("probes Cloud Connector when owner key is set", async () => {
    const { log } = captureLogs();
    const result = await runDoctor({
      env: {
        UNIFI_API_KEY: "x".repeat(40),
        UNIFI_API_KEY_OWNER: "y".repeat(40),
      },
      fetchImpl: makeFetch(200),
      log,
    });
    expect(check(result, "UNIFI_API_KEY_OWNER").status).toBe("ok");
    expect(check(result, "Cloud Connector probe").status).toBe("ok");
    expect(result.exitCode).toBe(0);
  });

  it("flags owner key 403 as fail", async () => {
    const { log } = captureLogs();
    // First call (Site Manager) ok, second call (Cloud Connector) fails
    let callCount = 0;
    const fetchImpl = vi.fn(async () => {
      callCount += 1;
      const status = callCount === 1 ? 200 : 403;
      return {
        ok: status === 200,
        status,
        headers: new Headers(),
        json: async () => ({}),
        text: async () => "",
      };
    }) as unknown as typeof fetch;

    const result = await runDoctor({
      env: {
        UNIFI_API_KEY: "x".repeat(40),
        UNIFI_API_KEY_OWNER: "y".repeat(40),
      },
      fetchImpl,
      log,
    });
    expect(check(result, "Cloud Connector probe").status).toBe("fail");
    expect(result.exitCode).toBe(1);
  });

  it("renders all checks to log output", async () => {
    const { log, lines } = captureLogs();
    await runDoctor({
      env: { UNIFI_API_KEY: "x".repeat(40) },
      fetchImpl: makeFetch(200),
      log,
    });
    const joined = lines.join("\n");
    expect(joined).toContain("UniFi MCP Server — Doctor");
    expect(joined).toContain("UNIFI_API_KEY");
    expect(joined).toContain("Site Manager API ping");
    expect(joined).toContain("Result:");
  });
});
