import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env },
});

const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log(`\n✅ ${tools.tools.length} tools registered:\n`);
for (const t of tools.tools) {
  console.log(`  - ${t.name}: ${t.description}`);
}

// Test list-sites-overview (semantic)
console.log("\n=== list-sites-overview ===");
const overview = await client.callTool({ name: "list-sites-overview", arguments: {} });
const ovData = JSON.parse(overview.content[0].text);
console.log(`  Status: ${ovData.status}`);
console.log(`  Summary: ${ovData.summary}`);
for (const s of ovData.sites) {
  console.log(`  • ${s.name}: ${s.status} — ${s.summary} (${s.devices.total} devices)`);
}

// Test analyze-site-health (semantic)
console.log("\n=== analyze-site-health (USM) ===");
const health = await client.callTool({ name: "analyze-site-health", arguments: { name: "USM" } });
const hData = JSON.parse(health.content[0].text);
console.log(`  Site: ${hData.site}`);
console.log(`  Status: ${hData.status}`);
console.log(`  Summary: ${hData.summary}`);
if (hData.gateway) {
  console.log(`  Gateway: ${hData.gateway.model} (${hData.gateway.ip}) — up since ${hData.gateway.upSince}`);
}
for (const issue of hData.issues) {
  console.log(`  ⚠ [${issue.severity}] ${issue.type}: ${issue.detail}`);
}

// Test detect-recent-reboots (semantic)
console.log("\n=== detect-recent-reboots (72h) ===");
const reboots = await client.callTool({ name: "detect-recent-reboots", arguments: { hours: 72 } });
const rData = JSON.parse(reboots.content[0].text);
console.log(`  Status: ${rData.status}`);
console.log(`  Summary: ${rData.summary}`);
for (const r of rData.reboots) {
  console.log(`  • [${r.severity}] ${r.site}/${r.device} (${r.model}) — ${r.hoursAgo}h ago`);
}

// Test raw tools
console.log("\n=== list-hosts (raw) ===");
const hosts = await client.callTool({ name: "list-hosts", arguments: {} });
const hostData = JSON.parse(hosts.content[0].text);
console.log(`  ${hostData.length} host(s)`);

console.log("\n=== get-isp-metrics (optional) ===");
const isp = await client.callTool({ name: "get-isp-metrics", arguments: {} });
const ispData = JSON.parse(isp.content[0].text);
console.log(`  Available: ${ispData.available !== false}`);

console.log("\n✅ All smoke tests passed!\n");

await client.close();
process.exit(0);
