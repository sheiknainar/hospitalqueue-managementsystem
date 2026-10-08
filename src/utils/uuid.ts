// UUID generator utility with fallback for non-secure contexts (e.g., HTTP on local network IP)
export function generateUUID(): string {
  try {
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallback below
  }

  // RFC4122 v4 compliant fallback
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return (([1e7] as unknown as string) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) => {
      const num = Number(c);
      return (num ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))).toString(16);
    });
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Polyfill window.crypto.randomUUID if absent
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as unknown as { crypto: unknown }).crypto = {};
  }
  if (typeof window.crypto.randomUUID !== 'function') {
    try {
      window.crypto.randomUUID = generateUUID as unknown as () => `${string}-${string}-${string}-${string}-${string}`;
    } catch {
      // Ignored if object is frozen
    }
  }
}
