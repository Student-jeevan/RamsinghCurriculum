/**
 * store.js — LocalStorage abstraction for the Learning Dashboard
 * ES Module — all keys are auto-prefixed with 'ldb_' to avoid collisions
 */

const PREFIX = 'ldb_';

export const store = {

  // ─── Core CRUD ───────────────────────────────────────────────────────────

  /**
   * Get a value from localStorage by key. Automatically deserializes JSON.
   * @param {string} key - Storage key (without prefix)
   * @returns {*} Parsed value or null if not found / parse error
   */
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set a value in localStorage. Automatically serializes to JSON.
   * @param {string} key - Storage key (without prefix)
   * @param {*} value - Any JSON-serializable value
   */
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  /**
   * Read-modify-write pattern. Reads current value, passes it to updaterFn,
   * and stores the returned result.
   * @param {string} key - Storage key (without prefix)
   * @param {Function} updaterFn - Receives current value, returns new value
   * @returns {*} The updated value
   */
  update(key, updaterFn) {
    const current = this.get(key);
    const updated = updaterFn(current);
    this.set(key, updated);
    return updated;
  },

  /**
   * Delete a key from localStorage.
   * @param {string} key - Storage key (without prefix)
   */
  delete(key) {
    localStorage.removeItem(PREFIX + key);
  },

  // ─── Activity Tracking ──────────────────────────────────────────────────

  /**
   * Get all activity data. Used for heatmap, streak, and analytics.
   * @returns {Object} Map of 'YYYY-MM-DD' → { hours, topicsCompleted, problemsSolved }
   */
  getActivity() {
    return this.get('activity') || {};
  },

  /**
   * Log activity for a specific date. Merges provided data with existing
   * entry for that date, preserving unmodified fields.
   * @param {string} dateStr - Date in 'YYYY-MM-DD' format
   * @param {Object} data - Partial activity data to merge
   */
  logActivity(dateStr, data) {
    const activity = this.getActivity();
    const defaults = { hours: 0, topicsCompleted: 0, problemsSolved: 0 };
    activity[dateStr] = { ...(activity[dateStr] || defaults), ...data };
    this.set('activity', activity);
  },

  /**
   * Increment a single numeric field in the activity for a specific date.
   * Creates the activity entry with defaults if it doesn't exist yet.
   * @param {string} dateStr - Date in 'YYYY-MM-DD' format
   * @param {string} field - Field name to increment (e.g., 'hours', 'topicsCompleted')
   * @param {number} [amount=1] - Amount to add
   */
  incrementActivity(dateStr, field, amount = 1) {
    const activity = this.getActivity();
    if (!activity[dateStr]) {
      activity[dateStr] = { hours: 0, topicsCompleted: 0, problemsSolved: 0 };
    }
    activity[dateStr][field] = (activity[dateStr][field] || 0) + amount;
    this.set('activity', activity);
  },

  // ─── Bulk Operations ───────────────────────────────────────────────────

  /**
   * Get all dashboard keys (without the prefix) currently in localStorage.
   * Only returns keys belonging to this application.
   * @returns {string[]} Array of unprefixed key names
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(PREFIX)) {
        keys.push(key.slice(PREFIX.length));
      }
    }
    return keys;
  },

  /**
   * Export all dashboard data as a JSON file download.
   * Creates a timestamped backup file and triggers browser download.
   */
  exportAll() {
    const data = {};
    this.getAllKeys().forEach(key => {
      data[key] = this.get(key);
    });

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
  },

  /**
   * Import data from a JSON string. Clears all existing dashboard data
   * before restoring from the import.
   * @param {string} jsonStr - JSON string from a previous export
   * @returns {boolean} true if import succeeded, false on error
   */
  importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);

      // Clear existing dashboard data
      this.getAllKeys().forEach(key => this.delete(key));

      // Restore all key-value pairs from import
      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value);
      });

      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  },

  // ─── Settings ───────────────────────────────────────────────────────────

  /**
   * Get dashboard settings with defaults.
   * @returns {Object} Settings object
   */
  getSettings() {
    return this.get('settings') || {
      theme: 'dark',
      currentFocus: '',
      studyTimerStart: null
    };
  },

  /**
   * Merge partial updates into the current settings.
   * @param {Object} updates - Key-value pairs to merge into settings
   */
  updateSettings(updates) {
    const settings = this.getSettings();
    this.set('settings', { ...settings, ...updates });
  }
};
