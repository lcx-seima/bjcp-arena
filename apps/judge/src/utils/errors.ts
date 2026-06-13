import { ApiClientHttpError } from "@bjcp-arena/api-client";

export function readError(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiClientHttpError && error.status === 401;
}
