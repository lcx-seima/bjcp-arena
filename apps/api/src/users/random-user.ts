import { randomInt } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function createRandomUsername() {
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export function createRandomNickname() {
  return `bjcp_${createRandomUsername()}`;
}
