import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export const storeStorage = createMMKV({ id: 'overhead-stores' });

const mmkvStateStorage: StateStorage = {
  getItem: (name) => storeStorage.getString(name) ?? null,
  setItem: (name, value) => storeStorage.set(name, value),
  removeItem: (name) => {
    storeStorage.remove(name);
  },
};

export const persistStorage = createJSONStorage(() => mmkvStateStorage);
