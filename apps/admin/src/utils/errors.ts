import { ApiClientHttpError } from "@bjcp-arena/api-client";

export function readError(error: unknown) {
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiClientHttpError && error.status === 401;
}

export function handleRequestError(error: unknown, onUnauthorized: () => void) {
  if (isUnauthorized(error)) {
    onUnauthorized();
    return "登录态已失效，请重新登录";
  }

  return readError(error);
}
