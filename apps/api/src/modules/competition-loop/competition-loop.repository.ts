import {
  findBjcpSubcategory,
  professionalScoreGrade,
  type EntityStatus,
  type ImportBeerRow,
  type ScoreInput,
} from "@bjcp-arena/contracts";
import type { PrismaClient } from "@prisma/client";
import type { AuthUserSnapshot } from "../auth/auth-user-snapshot-store.js";

export interface StoredCompetition {
  id: number;
  name: string;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredBeer {
  id: number;
  competitionId: number;
  entryCode: string;
  entryNumber: number;
  bjcpCategoryCode: string;
  bjcpCategoryName: string;
  bjcpSubcategoryCode: string;
  bjcpSubcategoryName: string;
  description: string;
  name: string;
  brewery: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredRound {
  id: number;
  competitionId: number;
  name: string;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredRoundBeer {
  id: number;
  competitionId: number;
  roundId: number;
  beerId: number;
  createdAt: Date;
}

export interface StoredScore {
  id: number;
  competitionId: number;
  roundId: number;
  beerId: number;
  judgeUserId: number;
  judgeTypeSnapshot: "professional" | "public";
  judgeNicknameSnapshot: string;
  professionalAromaScore: number | null;
  professionalAromaComment: string | null;
  professionalAppearanceScore: number | null;
  professionalAppearanceComment: string | null;
  professionalFlavorScore: number | null;
  professionalFlavorComment: string | null;
  professionalMouthfeelScore: number | null;
  professionalMouthfeelComment: string | null;
  professionalOverallScore: number | null;
  professionalOverallComment: string | null;
  professionalTotalScore: number | null;
  professionalGrade: string | null;
  amateurDrinkabilityScore: number | null;
  amateurBalanceScore: number | null;
  amateurFlavorAcceptanceScore: number | null;
  amateurRepeatIntentionScore: number | null;
  amateurTotalScore: number | null;
  amateurComment: string | null;
  submittedAt: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type DbRoundBeerWithBeer = StoredRoundBeer & { beer: StoredBeer };
type DbScoreWithBeer = StoredScore & { beer: StoredBeer };

interface DbMutationCount {
  count: number;
}

interface DbBeerEntryAggregate {
  _max: {
    entryNumber: number | null;
  };
}

interface DbDelegate<Entity> {
  count(args?: unknown): Promise<number>;
  findMany<Result = Entity>(args?: unknown): Promise<Result[]>;
  findFirst<Result = Entity>(args?: unknown): Promise<Result | null>;
  findUnique<Result = Entity>(args?: unknown): Promise<Result | null>;
  create<Result = Entity>(args: unknown): Promise<Result>;
  update<Result = Entity>(args: unknown): Promise<Result>;
  delete(args: unknown): Promise<Entity>;
  updateMany(args: unknown): Promise<DbMutationCount>;
}

interface DbBeerEntryDelegate extends DbDelegate<StoredBeer> {
  aggregate(args: unknown): Promise<DbBeerEntryAggregate>;
}

interface CompetitionLoopPrismaClient {
  competition: DbDelegate<StoredCompetition>;
  beerEntry: DbBeerEntryDelegate;
  competitionRound: DbDelegate<StoredRound>;
  roundBeer: DbDelegate<StoredRoundBeer>;
  score: DbDelegate<StoredScore>;
}

export interface UpsertBeerResult {
  beer: StoredBeer;
  created: boolean;
}

export interface CompetitionLoopRepository {
  countCompetitions(): Promise<number>;
  listCompetitions(): Promise<StoredCompetition[]>;
  findCompetition(id: number): Promise<StoredCompetition | null>;
  createCompetition(input: { name: string }): Promise<StoredCompetition>;
  updateCompetition(
    id: number,
    input: { name?: string | undefined; status?: EntityStatus | undefined }
  ): Promise<StoredCompetition | null>;
  listBeers(competitionId: number): Promise<StoredBeer[]>;
  findBeer(competitionId: number, beerId: number): Promise<StoredBeer | null>;
  upsertBeer(competitionId: number, input: ImportBeerRow): Promise<UpsertBeerResult>;
  listRounds(competitionId: number): Promise<StoredRound[]>;
  findRound(competitionId: number, roundId: number): Promise<StoredRound | null>;
  createRound(competitionId: number, input: { name: string }): Promise<StoredRound>;
  updateRound(
    competitionId: number,
    roundId: number,
    input: { name?: string | undefined; status?: EntityStatus | undefined }
  ): Promise<StoredRound | null>;
  deleteRound(competitionId: number, roundId: number): Promise<boolean>;
  listRoundBeers(
    competitionId: number,
    roundId: number
  ): Promise<Array<StoredRoundBeer & { beer: StoredBeer }>>;
  findRoundBeer(
    competitionId: number,
    roundId: number,
    beerId: number
  ): Promise<(StoredRoundBeer & { beer: StoredBeer }) | null>;
  addRoundBeer(
    competitionId: number,
    roundId: number,
    beerId: number
  ): Promise<StoredRoundBeer & { beer: StoredBeer }>;
  removeRoundBeer(competitionId: number, roundId: number, beerId: number): Promise<boolean>;
  countActiveScores(roundId: number, beerId?: number): Promise<number>;
  softDeleteScores(roundId: number, beerId: number): Promise<number>;
  findActiveScore(
    roundId: number,
    beerId: number,
    judgeUserId: number
  ): Promise<StoredScore | null>;
  listActiveScoresByJudge(
    roundId: number,
    judgeUserId: number
  ): Promise<Array<StoredScore & { beer: StoredBeer }>>;
  upsertScore(input: {
    competitionId: number;
    roundId: number;
    beerId: number;
    currentUser: AuthUserSnapshot;
    score: ScoreInput;
  }): Promise<StoredScore>;
}

function now() {
  return new Date();
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function cloneCompetition(value: StoredCompetition): StoredCompetition {
  return { ...value, createdAt: cloneDate(value.createdAt), updatedAt: cloneDate(value.updatedAt) };
}

function cloneBeer(value: StoredBeer): StoredBeer {
  return { ...value, createdAt: cloneDate(value.createdAt), updatedAt: cloneDate(value.updatedAt) };
}

function cloneRound(value: StoredRound): StoredRound {
  return { ...value, createdAt: cloneDate(value.createdAt), updatedAt: cloneDate(value.updatedAt) };
}

function cloneRoundBeer(value: StoredRoundBeer): StoredRoundBeer {
  return { ...value, createdAt: cloneDate(value.createdAt) };
}

function cloneScore(value: StoredScore): StoredScore {
  return {
    ...value,
    submittedAt: cloneDate(value.submittedAt),
    deletedAt: value.deletedAt ? cloneDate(value.deletedAt) : null,
    createdAt: cloneDate(value.createdAt),
    updatedAt: cloneDate(value.updatedAt),
  };
}

function beerSnapshot(
  competitionId: number,
  entryNumber: number,
  input: ImportBeerRow
): Omit<StoredBeer, "id" | "createdAt" | "updatedAt"> {
  const style = findBjcpSubcategory(input.bjcpSubcategoryCode);
  if (!style) {
    throw new Error(`BJCP subcategory not found: ${input.bjcpSubcategoryCode}`);
  }
  return {
    competitionId,
    entryCode: input.entryCode,
    entryNumber,
    bjcpCategoryCode: style.categoryCode,
    bjcpCategoryName: style.categoryName,
    bjcpSubcategoryCode: style.subcategoryCode,
    bjcpSubcategoryName: style.subcategoryName,
    description: input.description,
    name: input.name,
    brewery: input.brewery,
  };
}

function scoreFields(input: ScoreInput, currentUser: AuthUserSnapshot) {
  const submittedAt = now();
  const base = {
    judgeTypeSnapshot: input.judgeType,
    judgeNicknameSnapshot: currentUser.nickname,
    submittedAt,
    deletedAt: null,
  };
  if (input.judgeType === "professional") {
    const total =
      input.professionalAromaScore +
      input.professionalAppearanceScore +
      input.professionalFlavorScore +
      input.professionalMouthfeelScore +
      input.professionalOverallScore;
    return {
      ...base,
      professionalAromaScore: input.professionalAromaScore,
      professionalAromaComment: input.professionalAromaComment,
      professionalAppearanceScore: input.professionalAppearanceScore,
      professionalAppearanceComment: input.professionalAppearanceComment,
      professionalFlavorScore: input.professionalFlavorScore,
      professionalFlavorComment: input.professionalFlavorComment,
      professionalMouthfeelScore: input.professionalMouthfeelScore,
      professionalMouthfeelComment: input.professionalMouthfeelComment,
      professionalOverallScore: input.professionalOverallScore,
      professionalOverallComment: input.professionalOverallComment,
      professionalTotalScore: total,
      professionalGrade: professionalScoreGrade(total),
      amateurDrinkabilityScore: null,
      amateurBalanceScore: null,
      amateurFlavorAcceptanceScore: null,
      amateurRepeatIntentionScore: null,
      amateurTotalScore: null,
      amateurComment: null,
    };
  }
  const total =
    input.amateurDrinkabilityScore +
    input.amateurBalanceScore +
    input.amateurFlavorAcceptanceScore +
    input.amateurRepeatIntentionScore;
  return {
    ...base,
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
    professionalGrade: null,
    amateurDrinkabilityScore: input.amateurDrinkabilityScore,
    amateurBalanceScore: input.amateurBalanceScore,
    amateurFlavorAcceptanceScore: input.amateurFlavorAcceptanceScore,
    amateurRepeatIntentionScore: input.amateurRepeatIntentionScore,
    amateurTotalScore: total,
    amateurComment: input.amateurComment,
  };
}

export function createMemoryCompetitionLoopRepository(): CompetitionLoopRepository {
  let competitionSeq = 1;
  let beerSeq = 1;
  let roundSeq = 1;
  let roundBeerSeq = 1;
  let scoreSeq = 1;
  const competitions = new Map<number, StoredCompetition>();
  const beers = new Map<number, StoredBeer>();
  const rounds = new Map<number, StoredRound>();
  const roundBeers = new Map<number, StoredRoundBeer>();
  const scores = new Map<number, StoredScore>();

  function nextEntryNumber(competitionId: number) {
    const current = [...beers.values()].filter((beer) => beer.competitionId === competitionId);
    return current.length === 0 ? 1 : Math.max(...current.map((beer) => beer.entryNumber)) + 1;
  }

  function withBeer(binding: StoredRoundBeer) {
    const beer = beers.get(binding.beerId);
    if (!beer) throw new Error("Round beer references missing beer");
    return { ...cloneRoundBeer(binding), beer: cloneBeer(beer) };
  }

  return {
    async countCompetitions() {
      return competitions.size;
    },
    async listCompetitions() {
      return [...competitions.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(cloneCompetition);
    },
    async findCompetition(id) {
      const competition = competitions.get(id);
      return competition ? cloneCompetition(competition) : null;
    },
    async createCompetition(input) {
      const time = now();
      const competition: StoredCompetition = {
        id: competitionSeq++,
        name: input.name,
        status: "ongoing",
        createdAt: time,
        updatedAt: time,
      };
      competitions.set(competition.id, competition);
      return cloneCompetition(competition);
    },
    async updateCompetition(id, input) {
      const competition = competitions.get(id);
      if (!competition) return null;
      const updated: StoredCompetition = {
        ...competition,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: now(),
      };
      competitions.set(id, updated);
      return cloneCompetition(updated);
    },
    async listBeers(competitionId) {
      return [...beers.values()]
        .filter((beer) => beer.competitionId === competitionId)
        .sort((a, b) => a.entryNumber - b.entryNumber)
        .map(cloneBeer);
    },
    async findBeer(competitionId, beerId) {
      const beer = beers.get(beerId);
      return beer && beer.competitionId === competitionId ? cloneBeer(beer) : null;
    },
    async upsertBeer(competitionId, input) {
      const existing = [...beers.values()].find(
        (beer) => beer.competitionId === competitionId && beer.entryCode === input.entryCode
      );
      if (existing) {
        const updated: StoredBeer = {
          ...existing,
          ...beerSnapshot(competitionId, existing.entryNumber, input),
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: now(),
        };
        beers.set(existing.id, updated);
        return { beer: cloneBeer(updated), created: false };
      }
      const time = now();
      const beer: StoredBeer = {
        id: beerSeq++,
        ...beerSnapshot(competitionId, nextEntryNumber(competitionId), input),
        createdAt: time,
        updatedAt: time,
      };
      beers.set(beer.id, beer);
      return { beer: cloneBeer(beer), created: true };
    },
    async listRounds(competitionId) {
      return [...rounds.values()]
        .filter((round) => round.competitionId === competitionId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(cloneRound);
    },
    async findRound(competitionId, roundId) {
      const round = rounds.get(roundId);
      return round && round.competitionId === competitionId ? cloneRound(round) : null;
    },
    async createRound(competitionId, input) {
      const time = now();
      const round: StoredRound = {
        id: roundSeq++,
        competitionId,
        name: input.name,
        status: "ongoing",
        createdAt: time,
        updatedAt: time,
      };
      rounds.set(round.id, round);
      return cloneRound(round);
    },
    async updateRound(competitionId, roundId, input) {
      const round = rounds.get(roundId);
      if (!round || round.competitionId !== competitionId) return null;
      const updated: StoredRound = {
        ...round,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: now(),
      };
      rounds.set(roundId, updated);
      return cloneRound(updated);
    },
    async deleteRound(competitionId, roundId) {
      const round = rounds.get(roundId);
      if (!round || round.competitionId !== competitionId) return false;
      rounds.delete(roundId);
      return true;
    },
    async listRoundBeers(competitionId, roundId) {
      return [...roundBeers.values()]
        .filter((binding) => binding.competitionId === competitionId && binding.roundId === roundId)
        .map(withBeer)
        .sort((a, b) => a.beer.entryNumber - b.beer.entryNumber);
    },
    async findRoundBeer(competitionId, roundId, beerId) {
      const binding = [...roundBeers.values()].find(
        (candidate) =>
          candidate.competitionId === competitionId &&
          candidate.roundId === roundId &&
          candidate.beerId === beerId
      );
      return binding ? withBeer(binding) : null;
    },
    async addRoundBeer(competitionId, roundId, beerId) {
      const existing = [...roundBeers.values()].find(
        (candidate) =>
          candidate.competitionId === competitionId &&
          candidate.roundId === roundId &&
          candidate.beerId === beerId
      );
      if (existing) return withBeer(existing);
      const binding: StoredRoundBeer = {
        id: roundBeerSeq++,
        competitionId,
        roundId,
        beerId,
        createdAt: now(),
      };
      roundBeers.set(binding.id, binding);
      return withBeer(binding);
    },
    async removeRoundBeer(competitionId, roundId, beerId) {
      const existing = [...roundBeers.entries()].find(
        ([, candidate]) =>
          candidate.competitionId === competitionId &&
          candidate.roundId === roundId &&
          candidate.beerId === beerId
      );
      if (!existing) return false;
      roundBeers.delete(existing[0]);
      return true;
    },
    async countActiveScores(roundId, beerId) {
      return [...scores.values()].filter(
        (score) =>
          score.roundId === roundId &&
          score.deletedAt === null &&
          (beerId === undefined || score.beerId === beerId)
      ).length;
    },
    async softDeleteScores(roundId, beerId) {
      let count = 0;
      const time = now();
      for (const [id, score] of scores) {
        if (score.roundId === roundId && score.beerId === beerId && score.deletedAt === null) {
          scores.set(id, { ...score, deletedAt: time, updatedAt: time });
          count += 1;
        }
      }
      return count;
    },
    async findActiveScore(roundId, beerId, judgeUserId) {
      const score = [...scores.values()].find(
        (candidate) =>
          candidate.roundId === roundId &&
          candidate.beerId === beerId &&
          candidate.judgeUserId === judgeUserId &&
          candidate.deletedAt === null
      );
      return score ? cloneScore(score) : null;
    },
    async listActiveScoresByJudge(roundId, judgeUserId) {
      return [...scores.values()]
        .filter(
          (score) =>
            score.roundId === roundId &&
            score.judgeUserId === judgeUserId &&
            score.deletedAt === null
        )
        .map((score) => {
          const beer = beers.get(score.beerId);
          if (!beer) throw new Error("Score references missing beer");
          return { ...cloneScore(score), beer: cloneBeer(beer) };
        })
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    },
    async upsertScore(input) {
      const fields = scoreFields(input.score, input.currentUser);
      const existing = [...scores.values()].find(
        (score) =>
          score.roundId === input.roundId &&
          score.beerId === input.beerId &&
          score.judgeUserId === input.currentUser.id &&
          score.deletedAt === null
      );
      if (existing) {
        const updated: StoredScore = {
          ...existing,
          ...fields,
          updatedAt: now(),
        };
        scores.set(existing.id, updated);
        return cloneScore(updated);
      }
      const time = now();
      const score: StoredScore = {
        id: scoreSeq++,
        competitionId: input.competitionId,
        roundId: input.roundId,
        beerId: input.beerId,
        judgeUserId: input.currentUser.id,
        ...fields,
        createdAt: time,
        updatedAt: time,
      };
      scores.set(score.id, score);
      return cloneScore(score);
    },
  };
}

export function createPrismaCompetitionLoopRepository(
  prisma: PrismaClient
): CompetitionLoopRepository {
  const db = prisma as unknown as CompetitionLoopPrismaClient;

  function toCompetition(value: StoredCompetition): StoredCompetition {
    return {
      id: value.id,
      name: value.name,
      status: value.status,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }
  function toBeer(value: StoredBeer): StoredBeer {
    return {
      id: value.id,
      competitionId: value.competitionId,
      entryCode: value.entryCode,
      entryNumber: value.entryNumber,
      bjcpCategoryCode: value.bjcpCategoryCode,
      bjcpCategoryName: value.bjcpCategoryName,
      bjcpSubcategoryCode: value.bjcpSubcategoryCode,
      bjcpSubcategoryName: value.bjcpSubcategoryName,
      description: value.description,
      name: value.name,
      brewery: value.brewery,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }
  function toRound(value: StoredRound): StoredRound {
    return {
      id: value.id,
      competitionId: value.competitionId,
      name: value.name,
      status: value.status,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }
  function toRoundBeer(value: DbRoundBeerWithBeer): StoredRoundBeer & { beer: StoredBeer } {
    return {
      id: value.id,
      competitionId: value.competitionId,
      roundId: value.roundId,
      beerId: value.beerId,
      createdAt: value.createdAt,
      beer: toBeer(value.beer),
    };
  }
  function toScore(value: StoredScore): StoredScore {
    return {
      id: value.id,
      competitionId: value.competitionId,
      roundId: value.roundId,
      beerId: value.beerId,
      judgeUserId: value.judgeUserId,
      judgeTypeSnapshot: value.judgeTypeSnapshot,
      judgeNicknameSnapshot: value.judgeNicknameSnapshot,
      professionalAromaScore: value.professionalAromaScore,
      professionalAromaComment: value.professionalAromaComment,
      professionalAppearanceScore: value.professionalAppearanceScore,
      professionalAppearanceComment: value.professionalAppearanceComment,
      professionalFlavorScore: value.professionalFlavorScore,
      professionalFlavorComment: value.professionalFlavorComment,
      professionalMouthfeelScore: value.professionalMouthfeelScore,
      professionalMouthfeelComment: value.professionalMouthfeelComment,
      professionalOverallScore: value.professionalOverallScore,
      professionalOverallComment: value.professionalOverallComment,
      professionalTotalScore: value.professionalTotalScore,
      professionalGrade: value.professionalGrade,
      amateurDrinkabilityScore: value.amateurDrinkabilityScore,
      amateurBalanceScore: value.amateurBalanceScore,
      amateurFlavorAcceptanceScore: value.amateurFlavorAcceptanceScore,
      amateurRepeatIntentionScore: value.amateurRepeatIntentionScore,
      amateurTotalScore: value.amateurTotalScore,
      amateurComment: value.amateurComment,
      submittedAt: value.submittedAt,
      deletedAt: value.deletedAt,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  return {
    async countCompetitions() {
      return db.competition.count();
    },
    async listCompetitions() {
      return (await db.competition.findMany({ orderBy: { createdAt: "desc" } })).map(toCompetition);
    },
    async findCompetition(id) {
      const value = await db.competition.findUnique({ where: { id } });
      return value ? toCompetition(value) : null;
    },
    async createCompetition(input) {
      return toCompetition(await db.competition.create({ data: input }));
    },
    async updateCompetition(id, input) {
      const existing = await db.competition.findUnique({ where: { id } });
      if (!existing) return null;
      return toCompetition(await db.competition.update({ where: { id }, data: input }));
    },
    async listBeers(competitionId) {
      return (
        await db.beerEntry.findMany({ where: { competitionId }, orderBy: { entryNumber: "asc" } })
      ).map(toBeer);
    },
    async findBeer(competitionId, beerId) {
      const value = await db.beerEntry.findFirst({ where: { competitionId, id: beerId } });
      return value ? toBeer(value) : null;
    },
    async upsertBeer(competitionId, input) {
      const existing = await db.beerEntry.findFirst({
        where: { competitionId, entryCode: input.entryCode },
      });
      if (existing) {
        const updated = await db.beerEntry.update({
          where: { id: existing.id },
          data: beerSnapshot(competitionId, existing.entryNumber, input),
        });
        return { beer: toBeer(updated), created: false };
      }
      const max = await db.beerEntry.aggregate({
        where: { competitionId },
        _max: { entryNumber: true },
      });
      const created = await db.beerEntry.create({
        data: beerSnapshot(competitionId, (max._max.entryNumber ?? 0) + 1, input),
      });
      return { beer: toBeer(created), created: true };
    },
    async listRounds(competitionId) {
      return (
        await db.competitionRound.findMany({
          where: { competitionId },
          orderBy: { createdAt: "desc" },
        })
      ).map(toRound);
    },
    async findRound(competitionId, roundId) {
      const value = await db.competitionRound.findFirst({ where: { competitionId, id: roundId } });
      return value ? toRound(value) : null;
    },
    async createRound(competitionId, input) {
      return toRound(
        await db.competitionRound.create({ data: { competitionId, name: input.name } })
      );
    },
    async updateRound(competitionId, roundId, input) {
      const existing = await db.competitionRound.findFirst({
        where: { competitionId, id: roundId },
      });
      if (!existing) return null;
      return toRound(await db.competitionRound.update({ where: { id: roundId }, data: input }));
    },
    async deleteRound(competitionId, roundId) {
      const existing = await db.competitionRound.findFirst({
        where: { competitionId, id: roundId },
      });
      if (!existing) return false;
      await db.competitionRound.delete({ where: { id: roundId } });
      return true;
    },
    async listRoundBeers(competitionId, roundId) {
      return (
        await db.roundBeer.findMany<DbRoundBeerWithBeer>({
          where: { competitionId, roundId },
          include: { beer: true },
          orderBy: { beer: { entryNumber: "asc" } },
        })
      ).map(toRoundBeer);
    },
    async findRoundBeer(competitionId, roundId, beerId) {
      const value = await db.roundBeer.findFirst<DbRoundBeerWithBeer>({
        where: { competitionId, roundId, beerId },
        include: { beer: true },
      });
      return value ? toRoundBeer(value) : null;
    },
    async addRoundBeer(competitionId, roundId, beerId) {
      const existing = await db.roundBeer.findFirst<DbRoundBeerWithBeer>({
        where: { competitionId, roundId, beerId },
        include: { beer: true },
      });
      if (existing) return toRoundBeer(existing);
      const created = await db.roundBeer.create<DbRoundBeerWithBeer>({
        data: { competitionId, roundId, beerId },
        include: { beer: true },
      });
      return toRoundBeer(created);
    },
    async removeRoundBeer(competitionId, roundId, beerId) {
      const existing = await db.roundBeer.findFirst({ where: { competitionId, roundId, beerId } });
      if (!existing) return false;
      await db.roundBeer.delete({ where: { id: existing.id } });
      return true;
    },
    async countActiveScores(roundId, beerId) {
      return db.score.count({ where: { roundId, beerId, deletedAt: null } });
    },
    async softDeleteScores(roundId, beerId) {
      const result = await db.score.updateMany({
        where: { roundId, beerId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return result.count;
    },
    async findActiveScore(roundId, beerId, judgeUserId) {
      const value = await db.score.findFirst({
        where: { roundId, beerId, judgeUserId, deletedAt: null },
      });
      return value ? toScore(value) : null;
    },
    async listActiveScoresByJudge(roundId, judgeUserId) {
      return (
        await db.score.findMany<DbScoreWithBeer>({
          where: { roundId, judgeUserId, deletedAt: null },
          include: { beer: true },
          orderBy: { submittedAt: "desc" },
        })
      ).map((score) => ({ ...toScore(score), beer: toBeer(score.beer) }));
    },
    async upsertScore(input) {
      const fields = scoreFields(input.score, input.currentUser);
      const existing = await db.score.findFirst({
        where: {
          roundId: input.roundId,
          beerId: input.beerId,
          judgeUserId: input.currentUser.id,
          deletedAt: null,
        },
      });
      if (existing) {
        return toScore(await db.score.update({ where: { id: existing.id }, data: fields }));
      }
      return toScore(
        await db.score.create({
          data: {
            competitionId: input.competitionId,
            roundId: input.roundId,
            beerId: input.beerId,
            judgeUserId: input.currentUser.id,
            ...fields,
          },
        })
      );
    },
  };
}
