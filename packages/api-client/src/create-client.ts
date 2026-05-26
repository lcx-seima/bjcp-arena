import { pingPath, pingResultSchema, type PingResult } from "@bjcp-arena/contracts";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CreateApiClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function requestJson<TResponse>(
  fetcher: FetchLike,
  baseUrl: string,
  method: "GET",
  path: string,
  parse: (data: unknown) => TResponse
) {
  const response = await fetcher(joinUrl(baseUrl, path), {
    method,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${method} ${path} failed with status ${response.status}`);
  }

  return parse(await response.json());
}

export function createApiClient(options: CreateApiClientOptions) {
  const fetcher = options.fetch ?? fetch;

  return {
    ping(): Promise<PingResult> {
      return requestJson(fetcher, options.baseUrl, "GET", pingPath, (data) =>
        pingResultSchema.parse(data)
      );
    },
  };
}
