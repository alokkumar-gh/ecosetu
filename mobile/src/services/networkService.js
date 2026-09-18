/**
 * EcoSetu Network Service
 * Connectivity listener and state manager using @react-native-community/netinfo
 * Source of Truth: docs/09_FRONTEND_ARCHITECTURE.md Section 5.2
 */

let NetInfo = null;
try {
  const mod = require('@react-native-community/netinfo');
  NetInfo = mod.default || mod;
} catch (e) {
  NetInfo = null;
}

class NetworkService {
  constructor() {
    this._isConnected = true;
    this._isInternetReachable = true;
    this._connectionType = 'unknown';
    this._listeners = new Set();
    this._unsubscribeNetInfo = null;
    this._mockMode = false;

    this._init();
  }

  _init() {
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      this._unsubscribeNetInfo = NetInfo.addEventListener((state) => {
        if (this._mockMode) return;
        this._updateState({
          isConnected: Boolean(state.isConnected),
          isInternetReachable: state.isInternetReachable !== null ? Boolean(state.isInternetReachable) : Boolean(state.isConnected),
          type: state.type || 'unknown',
        });
      });

      // Initial check
      if (typeof NetInfo.fetch === 'function') {
        NetInfo.fetch().then((state) => {
          if (this._mockMode) return;
          this._updateState({
            isConnected: Boolean(state.isConnected),
            isInternetReachable: state.isInternetReachable !== null ? Boolean(state.isInternetReachable) : Boolean(state.isConnected),
            type: state.type || 'unknown',
          });
        }).catch(() => {});
      }
    }
  }

  _updateState({ isConnected, isInternetReachable, type }) {
    const wasConnected = this._isConnected;
    this._isConnected = isConnected;
    this._isInternetReachable = isInternetReachable;
    this._connectionType = type || this._connectionType;

    const eventPayload = {
      isConnected: this._isConnected,
      isInternetReachable: this._isInternetReachable,
      type: this._connectionType,
    };

    // Emit change event
    for (const listener of this._listeners) {
      try {
        listener(eventPayload);
      } catch (err) {
        console.error('[NetworkService] Listener error:', err);
      }
    }

    // Trigger online transition if reconnected
    if (!wasConnected && isConnected) {
      for (const listener of this._listeners) {
        if (listener._onOnline) {
          try {
            listener._onOnline(eventPayload);
          } catch (err) {
            console.error('[NetworkService] Online listener error:', err);
          }
        }
      }
    }
  }

  /**
   * Check if device is connected to the network
   * @returns {boolean}
   */
  isConnected() {
    return this._isConnected;
  }

  /**
   * Check if internet is verified reachable
   * @returns {boolean}
   */
  isInternetReachable() {
    return this._isInternetReachable;
  }

  /**
   * Get full network state
   * @returns {{ isConnected: boolean, isInternetReachable: boolean, type: string }}
   */
  getState() {
    return {
      isConnected: this._isConnected,
      isInternetReachable: this._isInternetReachable,
      type: this._connectionType,
    };
  }

  /**
   * Add connectivity change listener
   * @param {Function} callback
   * @param {Object} [options]
   * @param {Function} [options.onOnline]
   * @returns {Function} unsubscribe function
   */
  addListener(callback, options = {}) {
    if (options.onOnline) {
      callback._onOnline = options.onOnline;
    }
    this._listeners.add(callback);
    return () => this.removeListener(callback);
  }

  /**
   * Remove listener
   * @param {Function} callback
   */
  removeListener(callback) {
    this._listeners.delete(callback);
  }

  /**
   * Enable mock connection state for test suites
   * @param {boolean} isConnected
   * @param {string} [type='wifi']
   */
  setMockConnection(isConnected, type = 'wifi') {
    this._mockMode = true;
    this._updateState({
      isConnected: Boolean(isConnected),
      isInternetReachable: Boolean(isConnected),
      type,
    });
  }

  /**
   * Reset mock mode
   */
  resetMock() {
    this._mockMode = false;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this._unsubscribeNetInfo) {
      this._unsubscribeNetInfo();
      this._unsubscribeNetInfo = null;
    }
    this._listeners.clear();
  }
}

export const networkService = new NetworkService();
export default networkService;
