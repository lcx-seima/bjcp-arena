import {
  authBootstrapStatusPath,
  authBootstrapSuperAdminPath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authSessionSchema,
  beerListPath,
  beerListResultSchema,
  beerByIdPath,
  beerQrCodeListResultSchema,
  beerQrCodesPath,
  beerResultSchema,
  beerStatusPath,
  boardCompetitionSummaryPath,
  boardCompetitionSummarySchema,
  bootstrapStatusResultSchema,
  bootstrapSuperAdminInputSchema,
  competitionListPath,
  competitionByIdPath,
  competitionListResultSchema,
  competitionResultSchema,
  competitionStatusPath,
  createBeerInputSchema,
  createCompetitionInputSchema,
  createUserInputSchema,
  judgeBeerDetailPath,
  judgeBeerResultSchema,
  judgeMyScorePath,
  logoutResultSchema,
  loginInputSchema,
  myScoreResultSchema,
  pingPath,
  pingResultSchema,
  resetUserPasswordInputSchema,
  scoreInputSchema,
  submitMyScoreResultSchema,
  updateBeerInputSchema,
  updateBeerStatusInputSchema,
  updateCompetitionInputSchema,
  updateCompetitionStatusInputSchema,
  updateUserInputSchema,
  userByIdPath,
  userListResultSchema,
  userResetPasswordPath,
  userResultSchema,
  usersPath,
  type AuthSession,
  type BeerListResult,
  type BeerQrCodeListResult,
  type BeerResult,
  type BoardCompetitionSummary,
  type BootstrapStatusResult,
  type BootstrapSuperAdminInput,
  type CompetitionListResult,
  type CompetitionResult,
  type CreateBeerInput,
  type CreateCompetitionInput,
  type CreateUserInput,
  type JudgeBeerResult,
  type LoginInput,
  type LogoutResult,
  type MyScoreResult,
  type PingResult,
  type ResetUserPasswordInput,
  type ScoreInput,
  type SubmitMyScoreResult,
  type UpdateBeerInput,
  type UpdateBeerStatusInput,
  type UpdateCompetitionInput,
  type UpdateCompetitionStatusInput,
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

type Method = "GET" | "POST" | "PATCH" | "PUT";

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

    listCompetitions(): Promise<CompetitionListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        competitionListPath,
        (data) => competitionListResultSchema.parse(data),
        { token: getToken() }
      );
    },

    createCompetition(input: CreateCompetitionInput): Promise<CompetitionResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        competitionListPath,
        (data) => competitionResultSchema.parse(data),
        { body: createCompetitionInputSchema.parse(input), token: getToken() }
      );
    },

    getCompetition(competitionId: number): Promise<CompetitionResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        competitionByIdPath(competitionId),
        (data) => competitionResultSchema.parse(data),
        { token: getToken() }
      );
    },

    updateCompetition(
      competitionId: number,
      input: UpdateCompetitionInput
    ): Promise<CompetitionResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        competitionByIdPath(competitionId),
        (data) => competitionResultSchema.parse(data),
        { body: updateCompetitionInputSchema.parse(input), token: getToken() }
      );
    },

    updateCompetitionStatus(
      competitionId: number,
      input: UpdateCompetitionStatusInput
    ): Promise<CompetitionResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        competitionStatusPath(competitionId),
        (data) => competitionResultSchema.parse(data),
        { body: updateCompetitionStatusInputSchema.parse(input), token: getToken() }
      );
    },

    listBeers(competitionId: number): Promise<BeerListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        beerListPath(competitionId),
        (data) => beerListResultSchema.parse(data),
        { token: getToken() }
      );
    },

    createBeer(competitionId: number, input: CreateBeerInput): Promise<BeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        beerListPath(competitionId),
        (data) => beerResultSchema.parse(data),
        { body: createBeerInputSchema.parse(input), token: getToken() }
      );
    },

    getBeer(competitionId: number, beerId: number): Promise<BeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        beerByIdPath(competitionId, beerId),
        (data) => beerResultSchema.parse(data),
        { token: getToken() }
      );
    },

    updateBeer(
      competitionId: number,
      beerId: number,
      input: UpdateBeerInput
    ): Promise<BeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        beerByIdPath(competitionId, beerId),
        (data) => beerResultSchema.parse(data),
        { body: updateBeerInputSchema.parse(input), token: getToken() }
      );
    },

    updateBeerStatus(
      competitionId: number,
      beerId: number,
      input: UpdateBeerStatusInput
    ): Promise<BeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        beerStatusPath(competitionId, beerId),
        (data) => beerResultSchema.parse(data),
        { body: updateBeerStatusInputSchema.parse(input), token: getToken() }
      );
    },

    listBeerQrCodes(competitionId: number): Promise<BeerQrCodeListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        beerQrCodesPath(competitionId),
        (data) => beerQrCodeListResultSchema.parse(data),
        { token: getToken() }
      );
    },

    getJudgeBeer(competitionId: number, beerId: number): Promise<JudgeBeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        judgeBeerDetailPath(competitionId, beerId),
        (data) => judgeBeerResultSchema.parse(data),
        { token: getToken() }
      );
    },

    getMyScore(competitionId: number, beerId: number): Promise<MyScoreResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        judgeMyScorePath(competitionId, beerId),
        (data) => myScoreResultSchema.parse(data),
        { token: getToken() }
      );
    },

    submitMyScore(
      competitionId: number,
      beerId: number,
      input: ScoreInput
    ): Promise<SubmitMyScoreResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PUT",
        judgeMyScorePath(competitionId, beerId),
        (data) => submitMyScoreResultSchema.parse(data),
        { body: scoreInputSchema.parse(input), token: getToken() }
      );
    },

    getBoardCompetitionSummary(competitionId: number): Promise<BoardCompetitionSummary> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        boardCompetitionSummaryPath(competitionId),
        (data) => boardCompetitionSummarySchema.parse(data),
        { token: getToken() }
      );
    },
  };
}
