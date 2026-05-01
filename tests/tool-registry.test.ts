import { describe, it, expect, beforeEach } from "vitest";
import { ToolRegistry } from "../src/tool-registry.js";

describe("ToolRegistry", () => {
  let r: ToolRegistry;

  beforeEach(() => {
    r = new ToolRegistry();
    r.register("list-sites-overview", "Get health overview", "analysis");
    r.register("analyze-site-health", "Analyze site health", "analysis");
    r.register("list-firewall-zones", "List firewall zones", "firewall");
    r.register("list-acl-rules", "List ACL rules", "firewall");
    r.register("list-site-clients", "List clients", "clients");
    r.register("list-wans", "List WAN interfaces", "wan");
  });

  it("matches by tool name token", () => {
    expect(r.search("firewall").map((m) => m.name)).toContain("list-firewall-zones");
  });

  it("respects category filter", () => {
    const matches = r.search("list", "firewall");
    expect(matches.map((m) => m.name).sort()).toEqual(["list-acl-rules", "list-firewall-zones"]);
  });

  it("ranks name matches higher than description", () => {
    const matches = r.search("site");
    expect(matches[0].name).toMatch(/site/);
  });

  it("summary breakdown", () => {
    const s = r.summary();
    expect(s.total).toBe(6);
    expect(s.categoryBreakdown.firewall).toBe(2);
  });
});
