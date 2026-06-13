import type { UserPublic } from "@bjcp-arena/contracts";
import type { StoredUser } from "./users.types.js";

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
