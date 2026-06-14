const tokenStorageKey = "bjcp-arena.board.token";

export function readToken() {
  return localStorage.getItem(tokenStorageKey);
}

export function saveToken(token: string) {
  localStorage.setItem(tokenStorageKey, token);
}

export function clearToken() {
  localStorage.removeItem(tokenStorageKey);
}
