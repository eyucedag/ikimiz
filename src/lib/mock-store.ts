import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification, Couple, Invitation, ScreenNote, User } from '@/src/types';

export interface MockDB {
  currentUserId: string | null;
  users: User[];
  passwords: Record<string, string>;
  couples: Couple[];
  invitations: Invitation[];
  screenNotes: ScreenNote[];
  notifications: AppNotification[];
}

const STORAGE_KEY = 'ikimiz.mockdb.v1';

const emptyDB = (): MockDB => ({
  currentUserId: null,
  users: [],
  passwords: {},
  couples: [],
  invitations: [],
  screenNotes: [],
  notifications: [],
});

let cache: MockDB | null = null;

export const createId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export const nowIso = () => new Date().toISOString();

/** AsyncStorage tabanlı basit yerel veri deposu. */
export const mockStore = {
  async read(): Promise<MockDB> {
    if (cache) return cache;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      cache = raw ? { ...emptyDB(), ...(JSON.parse(raw) as MockDB) } : emptyDB();
    } catch {
      cache = emptyDB();
    }
    return cache;
  },

  /** Değişikliği uygular ve kalıcı olarak kaydeder. */
  async update<T>(mutator: (db: MockDB) => T): Promise<T> {
    const db = await this.read();
    const result = mutator(db);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return result;
  },

  async reset() {
    cache = emptyDB();
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

export const addMockNotification = (
  db: MockDB,
  userId: string,
  category: AppNotification['category'],
  title: string,
  body: string,
) => {
  db.notifications.unshift({
    id: createId(),
    userId,
    category,
    title,
    body,
    readAt: null,
    createdAt: nowIso(),
  });
};
