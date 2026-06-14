import { type CompetitionStatus } from "@bjcp-arena/contracts";

export interface StoredCompetition {
  id: number;
  name: string;
  description: string | null;
  status: CompetitionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoredCompetitionInput {
  name: string;
  description?: string | null;
}

export type UpdateStoredCompetitionInput = {
  name?: string;
  description?: string | null;
};
