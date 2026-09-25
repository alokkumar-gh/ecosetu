/**
 * EcoSetu Mobile Storage Wrapper
 * Persistent storage using @react-native-async-storage/async-storage
 * with in-memory / persistent test fallback for Node.js test execution.
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md, docs/13_SECURITY_PRIVACY.md
 */

let asyncStorageInstance = null;

try {
  // Try loading standard React Native AsyncStorage
  const mod = require('@react-native-async-storage/async-storage');
  asyncStorageInstance = mod.default || mod;
} catch (e) {
  // Graceful fallback for non-bundler Node.js environments (test suite)
  asyncStorageInstance = null;
}

// In-memory fallback map for test runners / headless node
const memoryStore = new Map();

const fallbackBackend = {
  async getItem(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async setItem(key, value) {
    memoryStore.set(key, String(value));
  },
  async removeItem(key) {
    memoryStore.delete(key);
  },
  async clear() {
    memoryStore.clear();
  },
  async getAllKeys() {
    return Array.from(memoryStore.keys());
  },
  async multiGet(keys) {
    return keys.map((key) => [key, memoryStore.has(key) ? memoryStore.get(key) : null]);
  },
  async multiSet(keyValuePairs) {
    for (const [key, value] of keyValuePairs) {
      memoryStore.set(key, String(value));
    }
  },
  async multiRemove(keys) {
    for (const key of keys) {
      memoryStore.delete(key);
    }
  },
};

const getBackend = () => {
  if (asyncStorageInstance && typeof asyncStorageInstance.getItem === 'function') {
    return asyncStorageInstance;
  }
  return fallbackBackend;
};

export const storage = {
  /**
   * Set custom backend (useful for testing)
   */
  setBackend(customBackend) {
    asyncStorageInstance = customBackend;
  },

  /**
   * Retrieve parsed item from storage
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async getItem(key) {
    try {
      const raw = await getBackend().getItem(key);
      if (raw === null || raw === undefined) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch (error) {
      console.error(`[Storage] Failed to read key: ${key}`, error);
      return null;
    }
  },

  /**
   * Store item with JSON serialization
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    if (value === undefined || value === null) {
      return this.removeItem(key);
    }
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (serialized === undefined) {
        return this.removeItem(key);
      }
      await getBackend().setItem(key, serialized);
    } catch (error) {
      console.error(`[Storage] Failed to write key: ${key}`, error);
      throw error;
    }
  },

  /**
   * Remove item by key
   * @param {string} key
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    try {
      await getBackend().removeItem(key);
    } catch (error) {
      console.error(`[Storage] Failed to remove key: ${key}`, error);
      throw error;
    }
  },

  /**
   * Clear all stored keys
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await getBackend().clear();
    } catch (error) {
      console.error('[Storage] Failed to clear storage', error);
      throw error;
    }
  },

  /**
   * Retrieve all keys in storage
   * @returns {Promise<string[]>}
   */
  async getAllKeys() {
    try {
      return await getBackend().getAllKeys();
    } catch (error) {
      console.error('[Storage] Failed to get all keys', error);
      return [];
    }
  },

  /**
   * Multi-get batch read
   * @param {string[]} keys
   * @returns {Promise<Array<[string, any]>>}
   */
  async multiGet(keys) {
    try {
      const pairs = await getBackend().multiGet(keys);
      return pairs.map(([k, v]) => {
        if (v === null || v === undefined) return [k, null];
        try {
          return [k, JSON.parse(v)];
        } catch {
          return [k, v];
        }
      });
    } catch (error) {
      console.error('[Storage] Failed multiGet', error);
      return keys.map((k) => [k, null]);
    }
  },

  /**
   * Multi-set batch write
   * @param {Array<[string, any]>} keyValuePairs
   * @returns {Promise<void>}
   */
  async multiSet(keyValuePairs) {
    try {
      const serialized = keyValuePairs.map(([k, v]) => [
        k,
        typeof v === 'string' ? v : JSON.stringify(v),
      ]);
      await getBackend().multiSet(serialized);
    } catch (error) {
      console.error('[Storage] Failed multiSet', error);
      throw error;
    }
  },

  /**
   * Multi-remove batch delete
   * @param {string[]} keys
   * @returns {Promise<void>}
   */
  async multiRemove(keys) {
    try {
      await getBackend().multiRemove(keys);
    } catch (error) {
      console.error('[Storage] Failed multiRemove', error);
      throw error;
    }
  },

  /**
   * Purge all user-specific domain caches to prevent cross-account leakage (Phase 18 Security Hardening)
   * @param {boolean} includeQueue - Whether to clear offline queue as well
   * @returns {Promise<void>}
   */
  async clearAllUserCaches(includeQueue = false) {
    try {
      const allKeys = await this.getAllKeys();
      const keysToRemove = allKeys.filter((key) => {
        if (!key.startsWith('@ecosetu_')) return false;
        if (!includeQueue && key === '@ecosetu_offline_queue') return false;
        return true;
      });
      if (keysToRemove.length > 0) {
        await this.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error('[Storage] Failed clearAllUserCaches', error);
    }
  },
};

export default storage;
