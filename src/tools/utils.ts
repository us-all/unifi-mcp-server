import { UniFiError } from "../client.js";
import { ConnectorError, ConnectorUnavailableError } from "../connector-client.js";

const SENSITIVE_PATTERNS = [
  /X-API-KEY/i,
  /api[_-]?key/i,
  /authorization/i,
  /bearer\s+\S+/i,
  /password/i,
  /secret/i,
];

function sanitize(text: string): string {
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

export function wrapToolHandler<T>(fn: (params: T) => Promise<unknown>) {
  return async (params: T) => {
    try {
      const result = await fn(params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const structured: Record<string, unknown> = {
        message: "Unknown error",
      };

      if (error instanceof ConnectorUnavailableError) {
        structured.message = error.message;
      } else if (error instanceof ConnectorError) {
        structured.message = sanitize(error.message);
        structured.status = error.status;
        structured.details = error.body;
      } else if (error instanceof UniFiError) {
        structured.message = sanitize(error.message);
        structured.status = error.status;
        structured.details = error.body;
      } else if (error instanceof Error) {
        structured.message = sanitize(error.message);
      } else {
        structured.message = sanitize(String(error));
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(structured, null, 2) }],
        isError: true,
      };
    }
  };
}
