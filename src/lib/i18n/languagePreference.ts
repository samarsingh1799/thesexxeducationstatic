const STORAGE_KEY = "preferredLocale";

export function setPreferredLocale(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Not remembered this session — no functional fallback needed.
  }
}

export function getPreferredLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
