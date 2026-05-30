import type { UserPublic } from "@bjcp-arena/contracts";

export interface StoredUser {
  id: number;
  username: string;
  nickname: string;
  passwordHash: string;
  roles: number;
  disabled: boolean;
  authVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicUser(user: StoredUser): UserPublic {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    roles: user.roles,
    disabled: user.disabled,
    authVersion: user.authVersion,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
