import type { JudgeType } from "@bjcp-arena/contracts";

export interface StoredScore {
  id: number;
  beerId: number;
  judgeUserId: number;
  judgeTypeSnapshot: JudgeType;
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
  publicOverallPreferenceScore: number | null;
  publicAromaBodyFoamScore: number | null;
  publicEntryAcceptanceScore: number | null;
  publicWillingToDrinkScore: number | null;
  publicComment: string | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UpsertStoredScoreInput = Omit<StoredScore, "id" | "createdAt" | "updatedAt">;
