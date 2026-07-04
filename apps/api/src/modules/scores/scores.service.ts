import type { ScoreInput } from "@bjcp-arena/contracts";
import type { AuthUserSnapshot } from "../auth/auth-user-snapshot-store.js";
import type { createBeerService } from "../beers/beers.service.js";
import type { StoredBeer } from "../beers/beers.types.js";
import {
  CompetitionNotFoundError,
  type createCompetitionService,
} from "../competitions/competitions.service.js";
import type { StoredCompetition } from "../competitions/competitions.types.js";
import type { ScoreRepository } from "./scores.repository.js";
import type { StoredScore, UpsertStoredScoreInput } from "./scores.types.js";

type CompetitionService = ReturnType<typeof createCompetitionService>;
type BeerService = ReturnType<typeof createBeerService>;

export class BeerNotFoundForScoreError extends Error {
  constructor(competitionId: number, beerId: number) {
    super(`Beer ${beerId} not found in competition ${competitionId}`);
  }
}

export class ScoreNotAllowedError extends Error {
  constructor(message = "Score submission is not allowed") {
    super(message);
  }
}

export interface ScoresServiceDependencies {
  competitions: CompetitionService;
  beers: BeerService;
  scores: ScoreRepository;
}

function emptyProfessionalFields() {
  return {
    professionalAromaScore: null,
    professionalAromaComment: null,
    professionalAppearanceScore: null,
    professionalAppearanceComment: null,
    professionalFlavorScore: null,
    professionalFlavorComment: null,
    professionalMouthfeelScore: null,
    professionalMouthfeelComment: null,
    professionalOverallScore: null,
    professionalOverallComment: null,
    professionalTotalScore: null,
  };
}

function emptyPublicFields() {
  return {
    publicOverallPreferenceScore: null,
    publicAromaBodyFoamScore: null,
    publicEntryAcceptanceScore: null,
    publicWillingToDrinkScore: null,
    publicComment: null,
  };
}

function toStoredScoreInput(
  beerId: number,
  currentUser: AuthUserSnapshot,
  input: ScoreInput
): UpsertStoredScoreInput {
  if (!currentUser.judgeType) {
    throw new ScoreNotAllowedError("Judge type is required");
  }

  if (input.judgeType !== currentUser.judgeType) {
    throw new ScoreNotAllowedError("Judge type does not match score form");
  }

  const base = {
    beerId,
    judgeUserId: currentUser.id,
    judgeTypeSnapshot: currentUser.judgeType,
    judgeNicknameSnapshot: currentUser.nickname,
    submittedAt: new Date(),
  };

  if (input.judgeType === "professional") {
    return {
      ...base,
      professionalAromaScore: input.professionalAromaScore,
      professionalAromaComment: input.professionalAromaComment ?? null,
      professionalAppearanceScore: input.professionalAppearanceScore,
      professionalAppearanceComment: input.professionalAppearanceComment ?? null,
      professionalFlavorScore: input.professionalFlavorScore,
      professionalFlavorComment: input.professionalFlavorComment ?? null,
      professionalMouthfeelScore: input.professionalMouthfeelScore,
      professionalMouthfeelComment: input.professionalMouthfeelComment ?? null,
      professionalOverallScore: input.professionalOverallScore,
      professionalOverallComment: input.professionalOverallComment ?? null,
      professionalTotalScore:
        input.professionalAromaScore +
        input.professionalAppearanceScore +
        input.professionalFlavorScore +
        input.professionalMouthfeelScore +
        input.professionalOverallScore,
      ...emptyPublicFields(),
    };
  }

  return {
    ...base,
    ...emptyProfessionalFields(),
    publicOverallPreferenceScore: input.publicOverallPreferenceScore,
    publicAromaBodyFoamScore: input.publicAromaBodyFoamScore,
    publicEntryAcceptanceScore: input.publicEntryAcceptanceScore,
    publicWillingToDrinkScore: input.publicWillingToDrinkScore,
    publicComment: input.publicComment ?? null,
  };
}

function toMyScore(score: StoredScore) {
  return {
    id: score.id,
    beerId: score.beerId,
    judgeUserId: score.judgeUserId,
    judgeTypeSnapshot: score.judgeTypeSnapshot,
    judgeNicknameSnapshot: score.judgeNicknameSnapshot,
    professionalAromaScore: score.professionalAromaScore,
    professionalAromaComment: score.professionalAromaComment,
    professionalAppearanceScore: score.professionalAppearanceScore,
    professionalAppearanceComment: score.professionalAppearanceComment,
    professionalFlavorScore: score.professionalFlavorScore,
    professionalFlavorComment: score.professionalFlavorComment,
    professionalMouthfeelScore: score.professionalMouthfeelScore,
    professionalMouthfeelComment: score.professionalMouthfeelComment,
    professionalOverallScore: score.professionalOverallScore,
    professionalOverallComment: score.professionalOverallComment,
    professionalTotalScore: score.professionalTotalScore,
    publicOverallPreferenceScore: score.publicOverallPreferenceScore,
    publicAromaBodyFoamScore: score.publicAromaBodyFoamScore,
    publicEntryAcceptanceScore: score.publicEntryAcceptanceScore,
    publicWillingToDrinkScore: score.publicWillingToDrinkScore,
    publicComment: score.publicComment,
    submittedAt: score.submittedAt.toISOString(),
    updatedAt: score.updatedAt.toISOString(),
  };
}

function toJudgeBeer(
  competition: StoredCompetition,
  beer: StoredBeer,
  currentUser: AuthUserSnapshot
) {
  return {
    id: beer.id,
    competitionId: beer.competitionId,
    entryNumber: beer.entryNumber,
    description: beer.description,
    status: beer.status,
    competitionStatus: competition.status,
    canScore:
      competition.status === "judging" && beer.status === "published" && currentUser.judgeType !== null,
    bjcpCategoryCode: beer.bjcpCategoryCode,
    bjcpCategoryName: beer.bjcpCategoryName,
    bjcpSubcategoryCode: beer.bjcpSubcategoryCode,
    bjcpSubcategoryName: beer.bjcpSubcategoryName,
  };
}

export function createScoreService({
  competitions,
  beers,
  scores,
}: ScoresServiceDependencies) {
  async function getCompetitionBeer(competitionId: number, beerId: number) {
    const competition = await competitions.findCompetition(competitionId);
    if (!competition) {
      throw new CompetitionNotFoundError(competitionId);
    }

    const beer = (await beers.listBeers(competitionId)).find((candidate) => candidate.id === beerId);
    if (!beer) {
      throw new BeerNotFoundForScoreError(competitionId, beerId);
    }

    return { competition, beer };
  }

  return {
    async getJudgeBeerDetail(
      competitionId: number,
      beerId: number,
      currentUser: AuthUserSnapshot
    ) {
      const { competition, beer } = await getCompetitionBeer(competitionId, beerId);
      return toJudgeBeer(competition, beer, currentUser);
    },

    async getMyScore(competitionId: number, beerId: number, currentUser: AuthUserSnapshot) {
      await getCompetitionBeer(competitionId, beerId);
      const score = await scores.findScore(beerId, currentUser.id);
      return score ? toMyScore(score) : null;
    },

    async submitMyScore(
      competitionId: number,
      beerId: number,
      currentUser: AuthUserSnapshot,
      input: ScoreInput
    ) {
      const { competition, beer } = await getCompetitionBeer(competitionId, beerId);
      if (competition.status !== "judging") {
        throw new ScoreNotAllowedError("Competition is not judging");
      }
      if (beer.status !== "published") {
        throw new ScoreNotAllowedError("Beer is not published");
      }

      const score = await scores.upsertScore(toStoredScoreInput(beerId, currentUser, input));
      return toMyScore(score);
    },
  };
}
