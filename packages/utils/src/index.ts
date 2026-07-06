const defaultApiBaseUrl = "http://localhost:4000";

function parsePort(value: string) {
  const portText = value.startsWith(":") ? value.slice(1) : value;
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("VITE_API_BASE_URL port must be between 1 and 65535");
  }
  return String(port);
}

export function resolveApiBaseUrl(value: string | undefined, currentPageHref: string) {
  const configuredValue = value?.trim();
  if (!configuredValue) {
    return defaultApiBaseUrl;
  }

  if (/^:?\d+$/.test(configuredValue)) {
    const currentPageUrl = new URL(currentPageHref);
    currentPageUrl.port = parsePort(configuredValue);
    currentPageUrl.pathname = "";
    currentPageUrl.search = "";
    currentPageUrl.hash = "";
    return currentPageUrl.origin;
  }

  return configuredValue;
}
