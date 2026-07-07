import { randomInt } from "node:crypto";

export function createRandomDefaultUsername() {
  return `tbc${String(randomInt(10_000)).padStart(4, "0")}`;
}

export async function createUniqueDefaultUsername({
  exists,
  generate = createRandomDefaultUsername,
  maxAttempts = 100,
}: {
  exists: (username: string) => Promise<boolean>;
  generate?: () => string;
  maxAttempts?: number;
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const username = generate();
    if (!(await exists(username))) {
      return username;
    }
  }

  throw new Error("Unable to generate unique username");
}
