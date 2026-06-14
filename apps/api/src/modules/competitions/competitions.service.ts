import type { CompetitionStatus } from "@bjcp-arena/contracts";
import type {
  CompetitionRepository,
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
  async function listCompetitions() {
    return competitions.listCompetitions();
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
    listCompetitions,
    findCompetition,
    ensureCompetitionExists,
    createCompetition,
    updateCompetition,
    updateCompetitionStatus,
  };
}
