import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// MCP Prompts: pre-built workflow templates that clients can invoke. Each
// returns a user-facing instruction the LLM should follow, leveraging the
// already-registered UniFi tools.

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "triage-site-degradation",
    {
      title: "Triage site degradation",
      description: "Investigate a site's health, recent reboots, client impact, and WAN status to produce a triage summary.",
      argsSchema: {
        hostName: z.string().describe("Host name of the site to triage (e.g. 'USM')"),
        windowHours: z.string().optional().describe("Reboot detection window in hours (default: 24)"),
      },
    },
    ({ hostName, windowHours }) => {
      const win = windowHours ?? "24";
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: [
              `Triage degradation on UniFi site ${JSON.stringify(hostName)} (last ${win}h).`,
              "",
              "Steps:",
              `1. Call \`analyze-site-health\` with hostName=${JSON.stringify(hostName)} to capture device status, WAN info, and severity flags.`,
              `2. Call \`detect-recent-reboots\` with hostName=${JSON.stringify(hostName)} and windowHours=${win} to find devices that rebooted in the window.`,
              `3. If the connector is available, call \`list-site-clients\` with hostName=${JSON.stringify(hostName)} and capture the client count (use default limit).`,
              `4. If the connector is available, call \`list-wans\` with hostName=${JSON.stringify(hostName)} to confirm per-WAN status; otherwise rely on the WAN block from step 1.`,
              "5. Produce a triage summary including:",
              "   - Overall severity (healthy / info / warning / critical / unknown) — use the worst from steps 1-4.",
              "   - Candidate root cause (e.g. 'Recent gateway reboot', 'WAN uptime <95%', 'Multiple offline devices').",
              "   - Client impact (online client count + any offline devices that serve clients).",
              "   - Recommended next action (1-2 bullets).",
            ].join("\n"),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    "firmware-rollout-audit",
    {
      title: "Firmware rollout audit",
      description: "Audit a firmware rollout: which hosts/devices are on the target version, which are lagging, and what to upgrade next.",
      argsSchema: {
        targetVersion: z.string().describe("Target firmware version to roll out (e.g. '7.5.83')"),
        hostNameFilter: z.string().optional().describe("Optional host name (or comma-separated list) to scope the audit; default scans all hosts"),
      },
    },
    ({ targetVersion, hostNameFilter }) => {
      const filter = hostNameFilter && hostNameFilter.trim().length > 0
        ? `scoped to host(s) ${JSON.stringify(hostNameFilter)}`
        : "across all hosts";
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: [
              `Audit firmware rollout to version ${JSON.stringify(targetVersion)} ${filter}.`,
              "",
              "Steps:",
              `1. Call \`firmware-inventory\` (no args) to enumerate all devices grouped by firmware version + model.`,
              hostNameFilter && hostNameFilter.trim().length > 0
                ? `2. Filter the result to hosts in ${JSON.stringify(hostNameFilter)} (split on comma, trim).`
                : "2. Keep all hosts in scope.",
              `3. Group devices into two buckets: (a) on target = currentFirmware === ${JSON.stringify(targetVersion)}; (b) lagging = anything else. Track model + count for each bucket.`,
              "4. Flag stuck/lagging models — any model where >=50% of units are not on target, or any device on a firmware older than the next-most-common version.",
              "5. Produce a rollout health report:",
              `   - % devices on ${JSON.stringify(targetVersion)} (overall and per-model).`,
              "   - Top 3 lagging models with current firmware versions and counts.",
              "   - Suggested next batch (5-10 devices) to upgrade, prioritizing stuck models and oldest firmware.",
            ].join("\n"),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    "wan-uptime-report",
    {
      title: "WAN uptime SLA report",
      description: "Compute a WAN uptime SLA-style report for a site over a window, with relative ranking against the fleet.",
      argsSchema: {
        hostName: z.string().describe("Host name of the site to report on"),
        days: z.string().optional().describe("Window length in days (default: 30)"),
      },
    },
    ({ hostName, days }) => {
      const window = days ?? "30";
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: [
              `Generate a WAN uptime SLA report for ${JSON.stringify(hostName)} over the last ${window} days.`,
              "",
              "Steps:",
              `1. Call \`wan-uptime-trend\` (no host filter) and capture per-WAN uptime % across the fleet for the last ${window} days. Pass days=${window} if the schema accepts it; otherwise use defaults and note the actual window in the report.`,
              `2. Filter the response to WANs belonging to host ${JSON.stringify(hostName)}; compute that site's average and minimum uptime %.`,
              `3. Call \`compare-sites\` to obtain side-by-side site rankings by WAN uptime; record the rank of ${JSON.stringify(hostName)} relative to peer sites.`,
              "4. Apply severity thresholds from the existing system:",
              "   - uptime < 80% → critical (SLA breach).",
              "   - uptime < 90% → critical.",
              "   - uptime < 95% → warning.",
              "   - >= 95% → healthy.",
              "5. Produce an SLA-style report with:",
              "   - Site uptime % (avg + min per WAN), severity, and rank vs peers.",
              "   - Worst WAN(s) called out with timestamps if available.",
              "   - Pass/fail vs a 95% SLA bar, and a 1-2 line recommendation.",
            ].join("\n"),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    "cross-site-anomaly-detection",
    {
      title: "Cross-site anomaly detection",
      description: "Compute fleet medians across sites and flag sites that deviate >2σ from the median on key health metrics.",
      argsSchema: {
        sitesFilter: z.string().optional().describe("'all' (default) or comma-separated host names to restrict the scan"),
      },
    },
    ({ sitesFilter }) => {
      const filter = sitesFilter && sitesFilter.trim().length > 0 ? sitesFilter : "all";
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: [
              `Detect cross-site anomalies (filter=${JSON.stringify(filter)}).`,
              "",
              "Steps:",
              "1. Call `list-hosts` to enumerate consoles. If sitesFilter !== 'all', restrict to host names in the comma-separated list.",
              "2. For each in-scope host, call `summarize-site` with hostName=<host> to collect device count, online %, WAN uptime, and (when connector is available) client count.",
              "3. Compute fleet medians and standard deviation (population σ) for: deviceCount, onlinePct, wanUptimePct, and clientDensity = clientCount / deviceCount (skip sites where clientCount is unavailable).",
              "4. Flag a site as an outlier if any metric is more than 2σ away from the median (in the worse direction — e.g. low onlinePct, low wanUptime, very high or very low clientDensity).",
              "5. Produce a ranked anomaly list:",
              "   - One row per flagged site: hostName, which metric(s) tripped, observed vs median, σ-distance.",
              "   - Sort by max σ-distance descending.",
              "   - One-line explanation per site (e.g. 'WAN uptime 87% vs fleet median 99%, 3.1σ low — likely ISP issue').",
              "   - If no outliers, state that the fleet is within 2σ on all metrics.",
            ].join("\n"),
          },
        }],
      };
    },
  );
}
