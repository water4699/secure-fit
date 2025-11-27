export class GenericStringStorage {
  private storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  async get(key: string): Promise<string | null> {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      return parsed[key] || null;
    } catch (e) {
      console.warn(`Failed to read from localStorage for key ${this.storageKey}:`, e);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const existing = localStorage.getItem(this.storageKey);
      const parsed = existing ? JSON.parse(existing) : {};
      parsed[key] = value;
      localStorage.setItem(this.storageKey, JSON.stringify(parsed));
    } catch (e) {
      console.warn(`Failed to write to localStorage for key ${this.storageKey}:`, e);
    }
  }

  async remove(key: string): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const existing = localStorage.getItem(this.storageKey);
      if (!existing) {
        return;
      }

      const parsed = JSON.parse(existing);
      delete parsed[key];
      localStorage.setItem(this.storageKey, JSON.stringify(parsed));
    } catch (e) {
      console.warn(`Failed to remove from localStorage for key ${this.storageKey}:`, e);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn(`Failed to clear localStorage for key ${this.storageKey}:`, e);
    }
  }
}
