import type { StoredCompetition } from "./competitions.types.js";

export function toCompetitionResult(competition: StoredCompetition) {
  return {
    id: competition.id,
    name: competition.name,
    description: competition.description,
    status: competition.status,
    createdAt: competition.createdAt.toISOString(),
    updatedAt: competition.updatedAt.toISOString(),
  };
}
