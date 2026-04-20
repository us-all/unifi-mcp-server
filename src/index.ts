#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateConfig, isConnectorAvailable } from "./config.js";
import { wrapToolHandler } from "./tools/utils.js";

// Raw API tools
import { listHostsSchema, listHosts, getHostSchema, getHost } from "./tools/hosts.js";
import { listSitesSchema, listSites } from "./tools/sites.js";
import { listDevicesSchema, listDevices } from "./tools/devices.js";
import { getIspMetricsSchema, getIspMetrics, queryIspMetricsSchema, queryIspMetrics } from "./tools/isp-metrics.js";
import {
  listSdwanConfigsSchema, listSdwanConfigs,
  getSdwanConfigSchema, getSdwanConfig,
  getSdwanConfigStatusSchema, getSdwanConfigStatus,
} from "./tools/sdwan.js";

// Analysis tools
import {
  listSitesOverviewSchema, listSitesOverview,
  analyzeSiteHealthSchema, analyzeSiteHealth,
  detectRecentRebootsSchema, detectRecentReboots,
} from "./tools/analysis.js";

// Connector tools (requires owner key)
import * as C from "./tools/connector.js";

validateConfig();

const server = new McpServer({
  name: "unifi",
  version: "1.0.0",
});

// === Analysis Tools (semantic) ===

server.tool("list-sites-overview",
  "Get a health overview of all UniFi sites with status, issues, and device counts",
  listSitesOverviewSchema.shape, wrapToolHandler(listSitesOverview));

server.tool("analyze-site-health",
  "Analyze health of a specific site by name (e.g., 'USM'). Returns device status, WAN info, reboot detection",
  analyzeSiteHealthSchema.shape, wrapToolHandler(analyzeSiteHealth));

server.tool("detect-recent-reboots",
  "Detect devices that rebooted within a time window. Checks all sites by default",
  detectRecentRebootsSchema.shape, wrapToolHandler(detectRecentReboots));

// === Raw API Tools (Site Manager) ===

server.tool("list-hosts",
  "List all UniFi console hosts (UDM, UDM Pro, Cloud Key, etc.)",
  listHostsSchema.shape, wrapToolHandler(listHosts));

server.tool("get-host",
  "Get detailed information about a specific host by ID",
  getHostSchema.shape, wrapToolHandler(getHost));

server.tool("list-sites",
  "List all sites with statistics (device counts, WAN status, ISP info)",
  listSitesSchema.shape, wrapToolHandler(listSites));

server.tool("list-devices",
  "List all devices across hosts (switches, APs, gateways, cameras)",
  listDevicesSchema.shape, wrapToolHandler(listDevices));

server.tool("get-isp-metrics",
  "Get ISP performance metrics. May be unavailable depending on account",
  getIspMetricsSchema.shape, wrapToolHandler(getIspMetrics));

server.tool("query-isp-metrics",
  "Query ISP metrics with filters. May be unavailable depending on account",
  queryIspMetricsSchema.shape, wrapToolHandler(queryIspMetrics));

server.tool("list-sdwan-configs",
  "List all SD-WAN configurations",
  listSdwanConfigsSchema.shape, wrapToolHandler(listSdwanConfigs));

server.tool("get-sdwan-config",
  "Get a specific SD-WAN configuration by ID",
  getSdwanConfigSchema.shape, wrapToolHandler(getSdwanConfig));

server.tool("get-sdwan-config-status",
  "Get the status of a specific SD-WAN configuration",
  getSdwanConfigStatusSchema.shape, wrapToolHandler(getSdwanConfigStatus));

// === Connector Tools (requires UNIFI_API_KEY_OWNER) ===

if (isConnectorAvailable()) {
  // App Info
  server.tool("get-app-info",
    "Get UniFi Network application info for a host",
    C.getAppInfoSchema.shape, wrapToolHandler(C.getAppInfo));

  // Sites (local)
  server.tool("list-local-sites",
    "List local sites on a specific console",
    C.listLocalSitesSchema.shape, wrapToolHandler(C.listLocalSites));

  // Devices
  server.tool("get-device-details",
    "List all devices with details (firmware, features) for a site",
    C.getDeviceDetailsSchema.shape, wrapToolHandler(C.getDeviceDetails));

  server.tool("get-device-by-id",
    "Get detailed info for a specific device by ID",
    C.getDeviceByIdSchema.shape, wrapToolHandler(C.getDeviceById));

  server.tool("get-device-statistics",
    "Get latest statistics for a specific device",
    C.getDeviceStatisticsSchema.shape, wrapToolHandler(C.getDeviceStatistics));

  server.tool("list-pending-devices",
    "List devices pending adoption on a host",
    C.listPendingDevicesSchema.shape, wrapToolHandler(C.listPendingDevices));

  // Clients
  server.tool("list-site-clients",
    "List connected clients for a site (default limit: 50)",
    C.listSiteClientsSchema.shape, wrapToolHandler(C.listSiteClients));

  server.tool("get-client-details",
    "Get detailed info for a specific client by ID",
    C.getClientDetailsSchema.shape, wrapToolHandler(C.getClientDetails));

  // Networks
  server.tool("list-networks",
    "List network configurations (VLANs, subnets) for a site",
    C.listNetworksSchema.shape, wrapToolHandler(C.listNetworks));

  server.tool("get-network-details",
    "Get detailed info for a specific network by ID",
    C.getNetworkDetailsSchema.shape, wrapToolHandler(C.getNetworkDetails));

  server.tool("get-network-references",
    "Get references for a specific network (what uses this network)",
    C.getNetworkReferencesSchema.shape, wrapToolHandler(C.getNetworkReferences));

  // WiFi
  server.tool("list-wifi-broadcasts",
    "List WiFi broadcast configurations (SSIDs) for a site",
    C.listWifiBroadcastsSchema.shape, wrapToolHandler(C.listWifiBroadcasts));

  server.tool("get-wifi-broadcast-details",
    "Get detailed info for a specific WiFi broadcast",
    C.getWifiBroadcastDetailsSchema.shape, wrapToolHandler(C.getWifiBroadcastDetails));

  // Hotspot
  server.tool("list-vouchers",
    "List hotspot vouchers for a site",
    C.listVouchersSchema.shape, wrapToolHandler(C.listVouchers));

  server.tool("get-voucher-details",
    "Get details for a specific voucher",
    C.getVoucherDetailsSchema.shape, wrapToolHandler(C.getVoucherDetails));

  // Firewall
  server.tool("list-firewall-zones",
    "List firewall zones for a site",
    C.listFirewallZonesSchema.shape, wrapToolHandler(C.listFirewallZones));

  server.tool("get-firewall-zone",
    "Get details for a specific firewall zone",
    C.getFirewallZoneSchema.shape, wrapToolHandler(C.getFirewallZone));

  server.tool("list-firewall-policies",
    "List firewall policies for a site",
    C.listFirewallPoliciesSchema.shape, wrapToolHandler(C.listFirewallPolicies));

  server.tool("get-firewall-policy",
    "Get details for a specific firewall policy",
    C.getFirewallPolicySchema.shape, wrapToolHandler(C.getFirewallPolicy));

  server.tool("get-firewall-policy-ordering",
    "Get the ordering of user-defined firewall policies",
    C.getFirewallPolicyOrderingSchema.shape, wrapToolHandler(C.getFirewallPolicyOrdering));

  // ACL
  server.tool("list-acl-rules",
    "List access control (ACL) rules for a site",
    C.listAclRulesSchema.shape, wrapToolHandler(C.listAclRules));

  server.tool("get-acl-rule",
    "Get details for a specific ACL rule",
    C.getAclRuleSchema.shape, wrapToolHandler(C.getAclRule));

  server.tool("get-acl-rule-ordering",
    "Get the ordering of user-defined ACL rules",
    C.getAclRuleOrderingSchema.shape, wrapToolHandler(C.getAclRuleOrdering));

  // DNS
  server.tool("list-dns-policies",
    "List DNS policies for a site",
    C.listDnsPoliciesSchema.shape, wrapToolHandler(C.listDnsPolicies));

  server.tool("get-dns-policy",
    "Get details for a specific DNS policy",
    C.getDnsPolicySchema.shape, wrapToolHandler(C.getDnsPolicy));

  // Traffic Matching
  server.tool("list-traffic-matching-lists",
    "List traffic matching lists for a site",
    C.listTrafficMatchingListsSchema.shape, wrapToolHandler(C.listTrafficMatchingLists));

  server.tool("get-traffic-matching-list",
    "Get details for a specific traffic matching list",
    C.getTrafficMatchingListSchema.shape, wrapToolHandler(C.getTrafficMatchingList));

  // Supporting Resources
  server.tool("list-wans",
    "List WAN interfaces for a site",
    C.listWansSchema.shape, wrapToolHandler(C.listWans));

  server.tool("list-vpn-tunnels",
    "List site-to-site VPN tunnels",
    C.listVpnTunnelsSchema.shape, wrapToolHandler(C.listVpnTunnels));

  server.tool("list-vpn-servers",
    "List VPN servers for a site",
    C.listVpnServersSchema.shape, wrapToolHandler(C.listVpnServers));

  server.tool("list-radius-profiles",
    "List RADIUS profiles for a site",
    C.listRadiusProfilesSchema.shape, wrapToolHandler(C.listRadiusProfiles));

  server.tool("list-device-tags",
    "List device tags for a site",
    C.listDeviceTagsSchema.shape, wrapToolHandler(C.listDeviceTags));

  // DPI & Reference
  server.tool("list-dpi-categories",
    "List DPI application categories",
    C.listDpiCategoriesSchema.shape, wrapToolHandler(C.listDpiCategories));

  server.tool("list-dpi-applications",
    "List DPI applications",
    C.listDpiApplicationsSchema.shape, wrapToolHandler(C.listDpiApplications));

  server.tool("list-countries",
    "List countries (reference data)",
    C.listCountriesSchema.shape, wrapToolHandler(C.listCountries));

  console.error("[UniFi] Connector tools enabled (33 tools, owner key detected)");
} else {
  console.error("[UniFi] Connector tools disabled (no UNIFI_API_KEY_OWNER)");
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const toolCount = isConnectorAvailable() ? 45 : 12;
  console.error(`[UniFi] MCP server running on stdio (v1.0.0, ${toolCount} tools)`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
