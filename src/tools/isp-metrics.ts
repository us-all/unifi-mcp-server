import { z } from "zod/v4";
import { unifiClient } from "../client.js";

export const getIspMetricsSchema = z.object({});

export async function getIspMetrics() {
  try {
    const response = await unifiClient.get<{ data: unknown }>("/isp-metrics");
    return response.data;
  } catch {
    return { available: false, message: "ISP metrics endpoint not available for this account" };
  }
}

export const queryIspMetricsSchema = z.object({
  hostIds: z.array(z.string()).optional().describe("Filter by host IDs"),
  siteIds: z.array(z.string()).optional().describe("Filter by site IDs"),
  duration: z.string().optional().describe("Time duration (e.g., '1h', '24h', '7d')"),
  metricType: z.enum(["latency", "downtime", "uptime", "speed"]).optional()
    .describe("Type of ISP metric to query"),
});

export async function queryIspMetrics(params: z.infer<typeof queryIspMetricsSchema>) {
  try {
    const body: Record<string, unknown> = {};
    if (params.hostIds) body.hostIds = params.hostIds;
    if (params.siteIds) body.siteIds = params.siteIds;
    if (params.duration) body.duration = params.duration;
    if (params.metricType) body.metricType = params.metricType;

    const response = await unifiClient.post<{ data: unknown }>("/isp-metrics/query", body);
    return response.data;
  } catch {
    return { available: false, message: "ISP metrics query endpoint not available for this account" };
  }
}
