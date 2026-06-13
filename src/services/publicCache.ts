type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();

const now = () => Date.now();

const readStorage = <T>(key: string): CacheEntry<T> | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed !== 'object' || Number(parsed.expiresAt || 0) <= now()) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeStorage = <T>(key: string, entry: CacheEntry<T>) => {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Public cache is an optimization only; storage errors should never block the app.
  }
};

export const getCachedPublicData = <T>(key: string): T | null => {
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memoryEntry && memoryEntry.expiresAt > now()) return memoryEntry.value;

  const storageEntry = readStorage<T>(key);
  if (!storageEntry) return null;
  memoryCache.set(key, storageEntry);
  return storageEntry.value;
};

export const setCachedPublicData = <T>(key: string, value: T, ttlMs = 60_000): T => {
  const entry: CacheEntry<T> = {
    value,
    expiresAt: now() + ttlMs,
  };
  memoryCache.set(key, entry);
  writeStorage(key, entry);
  return value;
};

export const fetchCachedPublicData = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; storage?: boolean } = {},
): Promise<T> => {
  const cacheKey = `locsang_public_cache:${key}`;
  const ttlMs = options.ttlMs ?? 60_000;
  const cached = options.storage === false ? (memoryCache.get(cacheKey) as CacheEntry<T> | undefined)?.value : getCachedPublicData<T>(cacheKey);

  if (cached) return cached;

  const pending = pendingRequests.get(cacheKey) as Promise<T> | undefined;
  if (pending) return pending;

  const request = fetcher()
    .then((value) => setCachedPublicData(cacheKey, value, ttlMs))
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, request);
  return request;
};
