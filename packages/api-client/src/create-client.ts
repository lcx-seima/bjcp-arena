import {
  addRoundBeerInputSchema,
  authBootstrapStatusPath,
  authBootstrapSuperAdminPath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authSessionSchema,
  beerImportPath,
  beerListPath,
  beerListResultSchema,
  beerByIdPath,
  beerResultSchema,
  bootstrapStatusResultSchema,
  bootstrapSuperAdminInputSchema,
  competitionListPath,
  competitionByIdPath,
  competitionListQuerySchema,
  competitionListResultSchema,
  competitionResultSchema,
  competitionStatusPath,
  createBeerInputSchema,
  createCompetitionInputSchema,
  createRoundInputSchema,
  createUserInputSchema,
  deleteMyScoreResultSchema,
  importBeersInputSchema,
  importBeersResultSchema,
  judgeBeerLookupInputSchema,
  judgeBeerResultSchema,
  judgeCompetitionListPath,
  judgeCompetitionListResultSchema,
  judgeRoundBeerLookupPath,
  judgeRoundBeerDetailPath,
  judgeRoundBeerScorePath,
  judgeRoundDetailPath,
  judgeRoundDetailResultSchema,
  judgeRoundListPath,
  judgeRoundListResultSchema,
  logoutResultSchema,
  loginInputSchema,
  myScoreResultSchema,
  pingPath,
  pingResultSchema,
  removeRoundBeerInputSchema,
  resetUserPasswordInputSchema,
  roundBeerListResultSchema,
  roundBeerPath,
  roundBeerResultSchema,
  roundByIdPath,
  roundListPath,
  roundListResultSchema,
  roundResultSchema,
  roundStatusPath,
  scoreInputSchema,
  submitMyScoreResultSchema,
  updateCurrentUserInputSchema,
  updateBeerInputSchema,
  updateCompetitionInputSchema,
  updateCompetitionStatusInputSchema,
  updateEntityStatusInputSchema,
  updateRoundInputSchema,
  updateUserInputSchema,
  userByIdPath,
  userListQuerySchema,
  userListResultSchema,
  userResetPasswordPath,
  userResultSchema,
  usersPath,
  type AddRoundBeerInput,
  type AuthSession,
  type BeerListResult,
  type BeerResult,
  type BootstrapStatusResult,
  type BootstrapSuperAdminInput,
  type CompetitionListQuery,
  type CompetitionListResult,
  type CompetitionResult,
  type CreateBeerInput,
  type CreateCompetitionInput,
  type CreateRoundInput,
  type CreateUserInput,
  type DeleteMyScoreResult,
  type ImportBeersInput,
  type ImportBeersResult,
  type JudgeBeerLookupInput,
  type JudgeBeerResult,
  type JudgeCompetitionListResult,
  type JudgeRoundDetailResult,
  type JudgeRoundListResult,
  type LoginInput,
  type LogoutResult,
  type MyScoreResult,
  type PingResult,
  type RemoveRoundBeerInput,
  type ResetUserPasswordInput,
  type RoundBeerListResult,
  type RoundBeerResult,
  type RoundListResult,
  type RoundResult,
  type ScoreInput,
  type SubmitMyScoreResult,
  type UpdateCurrentUserInput,
  type UpdateBeerInput,
  type UpdateCompetitionInput,
  type UpdateCompetitionStatusInput,
  type UpdateEntityStatusInput,
  type UpdateRoundInput,
  type UpdateUserInput,
  type UserListQuery,
  type UserListResult,
  type UserResult,
} from "@bjcp-arena/contracts";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CreateApiClientOptions {
  baseUrl: string;
  fetch?: FetchLike;
  getToken?: () => string | null | undefined;
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RequestJsonOptions {
  body?: unknown;
  token?: string | null | undefined;
}

export class ApiClientHttpError extends Error {
  readonly method: Method;
  readonly path: string;
  readonly status: number;
  readonly details: unknown;

  constructor(method: Method, path: string, status: number, message?: string, details?: unknown) {
    super(message ?? `${method} ${path} failed with status ${status}`);
    this.name = "ApiClientHttpError";
    this.method = method;
    this.path = path;
    this.status = status;
    this.details = details;
  }
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function withQuery(path: string, query: Record<string, string | number>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }
  return `${path}?${params.toString()}`;
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

async function readJsonSafely(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  return response.json().catch(() => null);
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
    const body = await readJsonSafely(response);
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : undefined;
    throw new ApiClientHttpError(method, path, response.status, message, body);
  }

  return parse(await response.json());
}

function requestOk(
  fetcher: FetchLike,
  baseUrl: string,
  method: Method,
  path: string,
  options: RequestJsonOptions = {}
) {
  return requestJson(fetcher, baseUrl, method, path, (data) => data as { ok: true }, options);
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

    updateCurrentUser(input: UpdateCurrentUserInput): Promise<UserResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        authMePath,
        (data) => userResultSchema.parse(data),
        { body: updateCurrentUserInputSchema.parse(input), token: getToken() }
      );
    },

    listUsers(query?: Partial<UserListQuery>): Promise<UserListResult> {
      const parsedQuery = userListQuerySchema.parse(query ?? {});
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        withQuery(usersPath, parsedQuery),
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

    listCompetitions(query?: Partial<CompetitionListQuery>): Promise<CompetitionListResult> {
      const parsedQuery = competitionListQuerySchema.parse(query ?? {});
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        withQuery(competitionListPath, parsedQuery),
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

    updateBeer(competitionId: number, beerId: number, input: UpdateBeerInput): Promise<BeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        beerByIdPath(competitionId, beerId),
        (data) => beerResultSchema.parse(data),
        { body: updateBeerInputSchema.parse(input), token: getToken() }
      );
    },

    importBeers(competitionId: number, input: ImportBeersInput): Promise<ImportBeersResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        beerImportPath(competitionId),
        (data) => importBeersResultSchema.parse(data),
        { body: importBeersInputSchema.parse(input), token: getToken() }
      );
    },

    listRounds(competitionId: number): Promise<RoundListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        roundListPath(competitionId),
        (data) => roundListResultSchema.parse(data),
        { token: getToken() }
      );
    },

    createRound(competitionId: number, input: CreateRoundInput): Promise<RoundResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        roundListPath(competitionId),
        (data) => roundResultSchema.parse(data),
        { body: createRoundInputSchema.parse(input), token: getToken() }
      );
    },

    updateRound(
      competitionId: number,
      roundId: number,
      input: UpdateRoundInput
    ): Promise<RoundResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        roundByIdPath(competitionId, roundId),
        (data) => roundResultSchema.parse(data),
        { body: updateRoundInputSchema.parse(input), token: getToken() }
      );
    },

    updateRoundStatus(
      competitionId: number,
      roundId: number,
      input: UpdateEntityStatusInput
    ): Promise<RoundResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PATCH",
        roundStatusPath(competitionId, roundId),
        (data) => roundResultSchema.parse(data),
        { body: updateEntityStatusInputSchema.parse(input), token: getToken() }
      );
    },

    listRoundBeers(competitionId: number, roundId: number): Promise<RoundBeerListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        roundBeerPath(competitionId, roundId),
        (data) => roundBeerListResultSchema.parse(data),
        { token: getToken() }
      );
    },

    addRoundBeer(
      competitionId: number,
      roundId: number,
      input: AddRoundBeerInput
    ): Promise<RoundBeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        roundBeerPath(competitionId, roundId),
        (data) => roundBeerResultSchema.parse(data),
        { body: addRoundBeerInputSchema.parse(input), token: getToken() }
      );
    },

    removeRoundBeer(
      competitionId: number,
      roundId: number,
      beerId: number,
      input: RemoveRoundBeerInput = {}
    ) {
      return requestOk(
        fetcher,
        options.baseUrl,
        "DELETE",
        `${roundBeerPath(competitionId, roundId)}/${beerId}`,
        { body: removeRoundBeerInputSchema.parse(input), token: getToken() }
      );
    },

    listJudgeCompetitions(): Promise<JudgeCompetitionListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        judgeCompetitionListPath,
        (data) => judgeCompetitionListResultSchema.parse(data),
        { token: getToken() }
      );
    },

    listJudgeRounds(competitionId: number): Promise<JudgeRoundListResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        judgeRoundListPath(competitionId),
        (data) => judgeRoundListResultSchema.parse(data),
        { token: getToken() }
      );
    },

    getJudgeRound(competitionId: number, roundId: number): Promise<JudgeRoundDetailResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        judgeRoundDetailPath(competitionId, roundId),
        (data) => judgeRoundDetailResultSchema.parse(data),
        { token: getToken() }
      );
    },

    lookupJudgeBeer(
      competitionId: number,
      roundId: number,
      input: JudgeBeerLookupInput
    ): Promise<JudgeBeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "POST",
        judgeRoundBeerLookupPath(competitionId, roundId),
        (data) => judgeBeerResultSchema.parse(data),
        { body: judgeBeerLookupInputSchema.parse(input), token: getToken() }
      );
    },

    getJudgeBeer(competitionId: number, roundId: number, beerId: number): Promise<JudgeBeerResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        judgeRoundBeerDetailPath(competitionId, roundId, beerId),
        (data) => judgeBeerResultSchema.parse(data),
        { token: getToken() }
      );
    },

    getMyScore(competitionId: number, roundId: number, beerId: number): Promise<MyScoreResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "GET",
        judgeRoundBeerScorePath(competitionId, roundId, beerId),
        (data) => myScoreResultSchema.parse(data),
        { token: getToken() }
      );
    },

    submitMyScore(
      competitionId: number,
      roundId: number,
      beerId: number,
      input: ScoreInput
    ): Promise<SubmitMyScoreResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "PUT",
        judgeRoundBeerScorePath(competitionId, roundId, beerId),
        (data) => submitMyScoreResultSchema.parse(data),
        { body: scoreInputSchema.parse(input), token: getToken() }
      );
    },

    deleteMyScore(
      competitionId: number,
      roundId: number,
      beerId: number
    ): Promise<DeleteMyScoreResult> {
      return requestJson(
        fetcher,
        options.baseUrl,
        "DELETE",
        judgeRoundBeerScorePath(competitionId, roundId, beerId),
        (data) => deleteMyScoreResultSchema.parse(data),
        { token: getToken() }
      );
    },
  };
}
