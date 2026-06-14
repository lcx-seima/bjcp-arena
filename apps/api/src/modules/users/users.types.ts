import type { JudgeType } from "@bjcp-arena/contracts";

export interface StoredUser {
  id: number;
  username: string;
  nickname: string;
  passwordHash: string;
  roles: number;
  judgeType: JudgeType | null;
  disabled: boolean;
  authVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoredUserInput {
  username: string;
  nickname: string;
  passwordHash: string;
  roles: number;
  judgeType?: JudgeType | null;
}
