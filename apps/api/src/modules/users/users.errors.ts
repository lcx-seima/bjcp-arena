export class DuplicateUsernameError extends Error {
  constructor() {
    super("Username already exists");
  }
}
