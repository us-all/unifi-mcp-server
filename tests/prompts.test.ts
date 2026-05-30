/**
 * MSP prompts: regression-guard the prompt content (tool references + argument
 * substitution). A typo in `firmware-inventory` → `firmware-inventroy` would
 * silently send the model on a wild-goose-chase; this catches that class of bug.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerPrompts } from "../src/prompts.js";

interface Capture {
  name: string;
  config: { argsSchema?: Record<string, unknown> };
  handler: (args: Record<string, string | undefined>) => {
    messages: Array<{ content: { type: string; text: string } }>;
  };
}

const captured: Capture[] = [];

beforeAll(() => {
  const fakeServer = {
    registerPrompt(
      name: string,
      config: Capture["config"],
      handler: Capture["handler"],
    ) {
      captured.push({ name, config, handler });
    },
  };
  // Cast: we only implement the surface registerPrompts touches.
  registerPrompts(fakeServer as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer);
});

function getPrompt(name: string): Capture {
  const p = captured.find((c) => c.name === name);
  if (!p) throw new Error(`prompt not registered: ${name}`);
  return p;
}

function textOf(name: string, args: Record<string, string | undefined>): string {
  const { handler } = getPrompt(name);
  const { messages } = handler(args);
  return messages.map((m) => m.content.text).join("\n");
}

describe("prompts registered", () => {
  it("registers 8 prompts (4 fleet-ops + 4 MSP)", () => {
    expect(captured).toHaveLength(8);
  });
});

describe("msp-onboard-site-checklist", () => {
  it("substitutes hostName into every tool reference", () => {
    const text = textOf("msp-onboard-site-checklist", { hostName: "CLIENT-HQ" });
    expect(text).toContain(`firmware-inventory`);
    expect(text).toContain(`get-host`);
    expect(text).toContain(`wan-uptime-trend`);
    expect(text).toContain(`summarize-site`);
    expect(text).toContain(`list-firewall-policies`);
    expect(text).toContain(`detect-recent-reboots`);
    expect(text).toContain(`list-pending-devices`);
    expect(text).toContain(`"CLIENT-HQ"`);
  });
});

describe("msp-monthly-client-report", () => {
  it("uses clientLabel when supplied, falls back to hostName otherwise", () => {
    const withLabel = textOf("msp-monthly-client-report", {
      hostName: "USM",
      clientLabel: "Acme Inc",
    });
    expect(withLabel).toContain("Acme Inc");

    const withoutLabel = textOf("msp-monthly-client-report", {
      hostName: "USM",
      clientLabel: undefined,
    });
    expect(withoutLabel).toContain("USM");
  });
});

describe("msp-fleet-firmware-plan", () => {
  it("references firmware-inventory and lays out staggered waves", () => {
    const text = textOf("msp-fleet-firmware-plan", {});
    expect(text).toContain("firmware-inventory");
    // Plan must mention rollout stages by name so the model produces them.
    expect(text.toLowerCase()).toContain("pilot");
    expect(text.toLowerCase()).toContain("canary");
  });
});

describe("msp-bandwidth-complaint-investigation", () => {
  it("substitutes hostName + references the bandwidth tools", () => {
    const text = textOf("msp-bandwidth-complaint-investigation", {
      hostName: "CLIENT-HQ",
    });
    expect(text).toContain(`"CLIENT-HQ"`);
    expect(text).toContain("top-clients-by-bandwidth");
    expect(text).toContain("wan-uptime-trend");
  });
});
