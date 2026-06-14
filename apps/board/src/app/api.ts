import { createApiClient, type FetchLike } from "@bjcp-arena/api-client";
import { apiBaseUrl } from "./env.js";
import { readToken } from "./session.js";

export const client = createApiClient({
  baseUrl: apiBaseUrl,
  fetch: fetch as FetchLike,
  getToken: readToken,
});
