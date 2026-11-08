// Sikker localStorage-innpakning: fanger SecurityError eller QuotaExceededError (f.eks. Safari Privat modus eller iframe-sandbox)
// og faller trygt tilbake på et minnebasert (in-memory Map) lager.
const minne = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      /* SecurityError eller blokkert lagring */
    }
    return minne.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    const sVal = String(value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, sVal);
      }
    } catch {
      /* SecurityError eller kvote (f.eks. Safari Privat modus) */
    }
    minne.set(key, sVal);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      /* SecurityError */
    }
    minne.delete(key);
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      /* SecurityError */
    }
    minne.clear();
  },
};
