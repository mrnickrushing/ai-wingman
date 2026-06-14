import AsyncStorage from '@react-native-async-storage/async-storage';

export type SavedBookmark = {
  id: string;
  sessionId: string;
  title: string;
  excerpt: string;
  createdAt: string;
};

const BOOKMARK_KEY = 'wingman:bookmarks';
const MAX_BOOKMARKS = 30;

export async function loadBookmarks(limit = MAX_BOOKMARKS): Promise<SavedBookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedBookmark[];
    return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export async function saveBookmark(input: Omit<SavedBookmark, 'id' | 'createdAt'>): Promise<SavedBookmark[]> {
  try {
    const existing = await loadBookmarks(MAX_BOOKMARKS - 1);
    const next: SavedBookmark = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    const list = [next, ...existing].slice(0, MAX_BOOKMARKS);
    await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

export async function removeBookmark(id: string): Promise<SavedBookmark[]> {
  const existing = await loadBookmarks(MAX_BOOKMARKS);
  const next = existing.filter((bookmark) => bookmark.id !== id);
  await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
  return next;
}
