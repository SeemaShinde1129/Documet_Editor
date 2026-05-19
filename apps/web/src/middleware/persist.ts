export type PersistConfig = {
  key: string;
};

export function createPersistConfig(key: string): PersistConfig {
  return { key };
}
