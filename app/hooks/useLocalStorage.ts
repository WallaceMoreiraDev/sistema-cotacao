import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        // If stored data is an empty array but initialValue has items, populate with initialValue
        if (
          Array.isArray(parsed) &&
          parsed.length === 0 &&
          Array.isArray(initialValue) &&
          initialValue.length > 0
        ) {
          setValue(initialValue);
          window.localStorage.setItem(key, JSON.stringify(initialValue));
        } else {
          setValue(parsed);
        }
      } else {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      }
    } catch (e) {
      console.error('Error reading localStorage key', key, e);
    }
    setIsHydrated(true);
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Error writing to localStorage key', key, e);
      }
    }
  }, [key, value, isHydrated]);

  return [value, setValue] as const;
}

