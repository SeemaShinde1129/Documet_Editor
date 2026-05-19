export const storage = {
  get<TValue>(key: string): TValue | null {
    if (typeof window === "undefined") {
      return null;
    }

    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as TValue) : null;
  },
  set<TValue>(key: string, value: TValue) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(key);
  },
};
