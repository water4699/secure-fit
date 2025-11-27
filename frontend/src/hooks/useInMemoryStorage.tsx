import { useRef } from "react";

export function useInMemoryStorage() {
  const storageRef = useRef<Map<string, string>>(new Map());

  const storage = {
    get: async (key: string): Promise<string | null> => {
      return storageRef.current.get(key) || null;
    },
    set: async (key: string, value: string): Promise<void> => {
      storageRef.current.set(key, value);
    },
    remove: async (key: string): Promise<void> => {
      storageRef.current.delete(key);
    },
    clear: async (): Promise<void> => {
      storageRef.current.clear();
    },
  };

  return { storage };
}
