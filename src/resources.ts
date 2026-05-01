import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { unifiClient } from "./client.js";
import { resolveDevicesByHostName } from "./helpers/resolver.js";

/**
 * MCP Resources for hot UniFi entities.
 * URI scheme: `unifi://`
 *   - unifi://site/{name}            — site overview by host name (e.g. 'USM')
 *   - unifi://devices                — all devices across all sites
 *   - unifi://hosts                  — all UniFi consoles
 */

function asJson(uri: string, data: unknown) {
  return {
    contents: [{
      uri,
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2),
    }],
  };
}

export function registerResources(server: McpServer): void {
  server.registerResource(
    "site",
    new ResourceTemplate("unifi://site/{name}", { list: undefined }),
    {
      title: "UniFi Site",
      description: "Site overview by host name (e.g. 'USM') — devices + statistics",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const name = decodeURIComponent(String(vars.name));
      const data = await resolveDevicesByHostName(name);
      return asJson(uri.toString(), data ?? { error: `site '${name}' not found` });
    },
  );

  server.registerResource(
    "devices",
    "unifi://devices",
    {
      title: "UniFi Devices (all sites)",
      description: "All devices across all sites with status, model, firmware",
      mimeType: "application/json",
    },
    async (uri) => {
      const data = await unifiClient.get("/devices");
      return asJson(uri.toString(), data);
    },
  );

  server.registerResource(
    "hosts",
    "unifi://hosts",
    {
      title: "UniFi Hosts (consoles)",
      description: "All UniFi consoles (UDM, UDM Pro, Cloud Key) with status",
      mimeType: "application/json",
    },
    async (uri) => {
      const data = await unifiClient.get("/hosts");
      return asJson(uri.toString(), data);
    },
  );
}
