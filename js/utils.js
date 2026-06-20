/**
 * utils.js — Core utility functions for the Learning Dashboard
 * ES Module — import individual functions as needed
 */

// ─── ID Generation ───────────────────────────────────────────────────────────

/**
 * Generate an 8-character random alphanumeric ID.
 * Uses crypto.getRandomValues for better randomness when available.
 * @returns {string} 8-char hex string
 */
export function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint8Array(8);
    crypto.getRandomValues(values);
    for (let i = 0; i < 8; i++) {
      id += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return id;
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format a Date object into a readable string.
 * @param {Date} date - The date to format
 * @param {string} [format='default'] - 'default' → 'Jun 21, 2026', 'short' → '06/21', 'iso' → '2026-06-21'
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'default') {
  if (!(date instanceof Date) || isNaN(date)) return '';

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (format) {
    case 'short':
      return `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

    case 'iso':
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    default:
      return `${MONTH_SHORT[month]} ${String(day).padStart(2, '0')}, ${year}`;
  }
}

/**
 * Get today's date as a 'YYYY-MM-DD' string.
 * @returns {string}
 */
export function getToday() {
  return formatDate(new Date(), 'iso');
}

/**
 * Get the ISO week number for a given date.
 * Algorithm: the week containing the first Thursday of the year is week 1.
 * @param {Date} date
 * @returns {number} Week number (1–53)
 */
export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Get the Monday (start of ISO week) for a given date, returned as 'YYYY-MM-DD'.
 * @param {Date} date
 * @returns {string} 'YYYY-MM-DD' of the Monday
 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  return formatDate(d, 'iso');
}

/**
 * Calculate the number of whole days between two dates.
 * @param {Date|string} d1
 * @param {Date|string} d2
 * @returns {number} Absolute number of days between d1 and d2
 */
export function getDaysBetween(d1, d2) {
  const date1 = typeof d1 === 'string' ? parseDate(d1) : new Date(d1);
  const date2 = typeof d2 === 'string' ? parseDate(d2) : new Date(d2);
  const msPerDay = 1000 * 60 * 60 * 24;
  // Normalize to midnight to avoid DST issues
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.abs(Math.round((utc2 - utc1) / msPerDay));
}

// ─── Throttle & Debounce ─────────────────────────────────────────────────────

/**
 * Debounce a function — delays execution until `ms` milliseconds after the
 * last invocation. Useful for search inputs, resize handlers, etc.
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, ms) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Throttle a function — ensures it executes at most once every `ms` milliseconds.
 * Useful for scroll handlers, frequent events, etc.
 * @param {Function} fn - Function to throttle
 * @param {number} ms - Minimum interval in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, ms) {
  let lastTime = 0;
  let timer = null;
  return function (...args) {
    const now = Date.now();
    const remaining = ms - (now - lastTime);
    clearTimeout(timer);
    if (remaining <= 0) {
      lastTime = now;
      fn.apply(this, args);
    } else {
      // Schedule a trailing call so the last invocation isn't lost
      timer = setTimeout(() => {
        lastTime = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}

// ─── Security ────────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS attacks.
 * @param {string} str - Raw string
 * @returns {string} Sanitized string safe for innerHTML
 */
export function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;'
  };
  return str.replace(/[&<>"'`/]/g, char => map[char]);
}

// ─── Toast Notifications ─────────────────────────────────────────────────────

/**
 * Show a toast notification that auto-dismisses after 3 seconds.
 * Creates a .toast-container if one doesn't exist yet.
 * @param {string} message - Text to display
 * @param {'success'|'error'|'info'} [type='success'] - Visual style
 */
export function showToast(message, type = 'success') {
  // Ensure a toast container exists
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-remove after 3 seconds with fade-out animation
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Streak Calculation ──────────────────────────────────────────────────────

/**
 * Calculate the current study streak from activity data.
 * Counts consecutive days (ending today or yesterday) where hours > 0.
 * @param {Object} activityData - Map of 'YYYY-MM-DD' → { hours: N, ... }
 * @returns {number} Number of consecutive active days
 */
export function calculateStreak(activityData) {
  if (!activityData || typeof activityData !== 'object') return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start checking from today, then move backwards
  const checkDate = new Date(today);

  // Check today first
  const todayStr = formatDate(checkDate, 'iso');
  if (activityData[todayStr] && activityData[todayStr].hours > 0) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // If today has no activity, start from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = formatDate(checkDate, 'iso');
    if (activityData[yesterdayStr] && activityData[yesterdayStr].hours > 0) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      return 0;
    }
  }

  // Walk backwards counting consecutive days
  while (true) {
    const dateStr = formatDate(checkDate, 'iso');
    if (activityData[dateStr] && activityData[dateStr].hours > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

/**
 * Parse a 'YYYY-MM-DD' string into a Date object in the local timezone.
 * @param {string} dateStr - Date string in ISO format
 * @returns {Date} Parsed date at midnight local time
 */
export function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the full month name from a zero-based month index.
 * @param {number} monthIndex - 0 (January) through 11 (December)
 * @returns {string} Full month name
 */
export function getMonthName(monthIndex) {
  return MONTH_NAMES[monthIndex] || '';
}

/**
 * Get the short day name from a zero-based day index.
 * @param {number} dayIndex - 0 (Sun) through 6 (Sat)
 * @returns {string} Short day name (e.g., 'Mon')
 */
export function getDayName(dayIndex) {
  return DAY_NAMES[dayIndex] || '';
}
