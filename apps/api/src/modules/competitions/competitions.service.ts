import type { CompetitionStatus } from "@bjcp-arena/contracts";
import type {
  CompetitionRepository,
  ListCompetitionsOptions,
} from "./competitions.repository.js";
import type {
  CreateStoredCompetitionInput,
  UpdateStoredCompetitionInput,
} from "./competitions.types.js";

export class CompetitionNotFoundError extends Error {
  constructor(id: number) {
    super(`Competition not found: ${id}`);
  }
}

export interface CompetitionServiceDependencies {
  competitions: CompetitionRepository;
}

export function createCompetitionService({ competitions }: CompetitionServiceDependencies) {
  async function countCompetitions() {
    return competitions.countCompetitions();
  }

  async function listCompetitions(options?: ListCompetitionsOptions) {
    return competitions.listCompetitions(options);
  }

  async function findCompetition(id: number) {
    return competitions.findCompetition(id);
  }

  async function ensureCompetitionExists(id: number) {
    const competition = await competitions.findCompetition(id);
    if (!competition) {
      throw new CompetitionNotFoundError(id);
    }
    return competition;
  }

  async function createCompetition(input: CreateStoredCompetitionInput) {
    return competitions.createCompetition(input);
  }

  async function updateCompetition(id: number, input: UpdateStoredCompetitionInput) {
    return competitions.updateCompetition(id, input);
  }

  async function updateCompetitionStatus(id: number, status: CompetitionStatus) {
    return competitions.updateCompetitionStatus(id, status);
  }

  return {
    countCompetitions,
    listCompetitions,
    findCompetition,
    ensureCompetitionExists,
    createCompetition,
    updateCompetition,
    updateCompetitionStatus,
  };
}
