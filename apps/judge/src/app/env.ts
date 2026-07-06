import { resolveApiBaseUrl } from "@bjcp-arena/utils";

export const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, window.location.href);
