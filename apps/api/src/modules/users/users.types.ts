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

export interface CreateStoredUserInput {
  username: string;
  nickname: string;
  passwordHash: string;
  roles: number;
}
