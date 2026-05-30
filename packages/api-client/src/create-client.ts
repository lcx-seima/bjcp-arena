import {
  authBootstrapStatusPath,
  authBootstrapSuperAdminPath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authSessionSchema,
  bootstrapStatusResultSchema,
  bootstrapSuperAdminInputSchema,
  createUserInputSchema,
  logoutResultSchema,
  loginInputSchema,
  pingPath,
  pingResultSchema,
  resetUserPasswordInputSchema,
  updateUserInputSchema,
  userByIdPath,
  userListResultSchema,
  userResetPasswordPath,
  userResultSchema,
  usersPath,
  type AuthSession,
  type BootstrapStatusResult,
  type BootstrapSuperAdminInput,
  type CreateUserInput,
  type LoginInput,
  type LogoutResult,
  type PingResult,
  type ResetUserPasswordInput,
  type UpdateUserInput,
  type UserListResult,
  type UserResult,
} from "@bjcp-arena/contracts";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CreateApiClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  getToken?: () => string | null | undefined;
}

type Method = "GET" | "POST" | "PATCH";

interface RequestJsonOptions {
  body?: unknown;
  token?: string | null | undefined;
}

export class ApiClientHttpError extends Error {
  readonly method: Method;
  readonly path: string;
  readonly status: number;

  constructor(method: Method, path: string, status: number) {
    super(`${method} ${path} failed with status ${status}`);
    this.name = "ApiClientHttpError";
    this.method = method;
    this.path = path;
    this.status = status;
  }
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function buildHeaders(options: RequestJsonOptions) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  return headers;
}

async function requestJson<TResponse>(
  fetcher: FetchLike,
  baseUrl: string,
  method: Method,
  path: string,
  parse: (data: unknown) => TResponse,
  options: RequestJsonOptions = {}
) {
  const hasBody = options.body !== undefined;
  const response = await fetcher(joinUrl(baseUrl, path), {
    method,
    headers: buildHeaders(options),
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    throw new ApiClientHttpError(method, path, response.status);
  }

  return parse(await response.json());
}

export function createApiClient(options: CreateApiClientOptions) {
  const fetcher = options.fetch ?? fetch;
  const getToken = () => options.getToken?.();

  return {
    ping(): Promise<PingResult> {
      return requestJson(fetcher, options.baseUrl, "GET", pingPath, (data) =>
        pingResultSchema.parse(data)
      );
    },

    getBootstrapStatus(): Promise<BootstrapStatusResult> {
      return requestJson(fetcher, options.baseUrl, "GET", authBootstrapStatusPath, (data) =>
        bootstrapStatusResultSchema.parse(data)
      );
    },

    bootstrapSuperAdmin(input: BootstrapSuperAdminInput): Promise<AuthSession> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        authBootstrapSuperAdminPath,
        (data) => authSessionSchema.parse(data),
        { body: bootstrapSuperAdminInputSchema.parse(input) }
      );
    },

    login(input: LoginInput): Promise<AuthSession> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        authLoginPath,
        (data) => authSessionSchema.parse(data),
        { body: loginInputSchema.parse(input) }
      );
    },

    me(): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        authMePath,
        (data) => userResultSchema.parse(data),
        { token: getToken() }
      );
    },

    logout(): Promise<LogoutResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        authLogoutPath,
        (data) => logoutResultSchema.parse(data),
        { token: getToken() }
      );
    },

    listUsers(): Promise<UserListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        usersPath,
        (data) => userListResultSchema.parse(data),
        { token: getToken() }
      );
    },

    createUser(input: CreateUserInput): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        usersPath,
        (data) => userResultSchema.parse(data),
        { body: createUserInputSchema.parse(input), token: getToken() }
      );
    },

    updateUser(id: number, input: UpdateUserInput): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        userByIdPath(id),
        (data) => userResultSchema.parse(data),
        { body: updateUserInputSchema.parse(input), token: getToken() }
      );
    },

    resetUserPassword(id: number, input: ResetUserPasswordInput): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        userResetPasswordPath(id),
        (data) => userResultSchema.parse(data),
        { body: resetUserPasswordInputSchema.parse(input), token: getToken() }
      );
    },
  };
}
