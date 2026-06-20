/**
 * app.js — Main Application Controller
 * Handles routing, theme management, keyboard shortcuts, and module lifecycle.
 */

import { store } from './store.js';
import { getDefaultCurriculum } from './data.js';
import { getToday, showToast } from './utils.js';

// Import all page modules
import * as dashboard from './dashboard.js';
import * as curriculum from './curriculum.js';
import * as topicDetail from './topicDetail.js';
import * as searchModule from './search.js';
import * as planner from './planner.js';
import * as mathTracker from './mathTracker.js';
import * as progTracker from './progTracker.js';
import * as problemTracker from './problemTracker.js';
import * as boardTracker from './boardTracker.js';
import * as knowledgeBase from './knowledgeBase.js';
import * as analytics from './analytics.js';

// ─── Route Configuration ─────────────────────────────────────────────
const routes = {
  dashboard:      { module: dashboard,       title: 'Dashboard' },
  curriculum:     { module: curriculum,       title: 'Curriculum Explorer' },
  planner:        { module: planner,          title: 'Daily Planner' },
  math:           { module: mathTracker,      title: 'Mathematics Tracker' },
  programming:    { module: progTracker,      title: 'Programming Tracker' },
  'problem-solving': { module: problemTracker, title: 'Problem Solving' },
  board:          { module: boardTracker,     title: 'Board Preparation' },
  'knowledge-base': { module: knowledgeBase,  title: 'Knowledge Base' },
  analytics:      { module: analytics,        title: 'Analytics' },
};

let currentRoute = null;
let currentModule = null;

// ─── Initialization ──────────────────────────────────────────────────
export function init() {
  // Initialize default data if first visit
  if (!store.get('curriculum')) {
    store.set('curriculum', getDefaultCurriculum());
  }

  // Apply theme
  applyTheme();

  // Initialize overlay modules (topic detail panel, search modal)
  topicDetail.init();
  searchModule.init();

  // Set up navigation event listeners
  setupNavigation();
  setupHeader();
  setupKeyboardShortcuts();
  setupMobileMenu();

  // Listen for custom navigation events (from search, etc.)
  document.addEventListener('navigate', (e) => {
    if (e.detail && e.detail.route) {
      navigate(e.detail.route);
    }
  });

  // Navigate to initial route
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigate(hash);

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    navigate(hash);
  });

  // Log today's activity (mark as visited)
  const today = getToday();
  const activity = store.getActivity();
  if (!activity[today]) {
    store.logActivity(today, { hours: 0, topicsCompleted: 0, problemsSolved: 0 });
  }
}

// ─── Navigation ──────────────────────────────────────────────────────
function navigate(route) {
  if (!routes[route]) {
    route = 'dashboard';
  }

  if (currentRoute === route) return;

  // Destroy current module
  if (currentModule && currentModule.destroy) {
    currentModule.destroy();
  }

  currentRoute = route;
  currentModule = routes[route].module;

  // Update URL hash
  if (window.location.hash.slice(1) !== route) {
    window.location.hash = route;
  }

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === route);
  });

  // Render page
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = currentModule.render();
  currentModule.init();

  // Update page title
  document.title = `${routes[route].title} — Learning Dashboard`;

  // Update header title
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) {
    headerTitle.textContent = routes[route].title;
  }

  // Close mobile menu if open
  closeMobileMenu();

  // Scroll to top
  mainContent.scrollTo(0, 0);
}

// ─── Theme Management ────────────────────────────────────────────────
function applyTheme() {
  const settings = store.getSettings();
  const theme = settings.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const settings = store.getSettings();
  const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
  store.updateSettings({ theme: newTheme });
  document.documentElement.setAttribute('data-theme', newTheme);
  updateThemeIcon(newTheme);
  showToast(`Switched to ${newTheme} mode`, 'info');
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  if (theme === 'dark') {
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
    btn.title = 'Switch to light mode';
  } else {
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.title = 'Switch to dark mode';
  }
}

// ─── Setup Functions ─────────────────────────────────────────────────
function setupNavigation() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (navItem && navItem.dataset.route) {
      e.preventDefault();
      navigate(navItem.dataset.route);
    }
  });
}

function setupHeader() {
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Search button
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('openSearch'));
    });
  }

  // Export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      store.exportAll();
      showToast('Data exported successfully!', 'success');
    });
  }

  // Import button
  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const success = store.importAll(ev.target.result);
          if (success) {
            showToast('Data imported successfully! Refreshing...', 'success');
            setTimeout(() => {
              currentRoute = null;
              navigate('dashboard');
            }, 500);
          } else {
            showToast('Import failed. Invalid file format.', 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+K / Cmd+K — Open search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('openSearch'));
      return;
    }

    // Ctrl+D — Toggle dark mode
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      toggleTheme();
      return;
    }

    // Don't trigger nav shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    // Number keys for quick navigation
    const navMap = {
      '1': 'dashboard',
      '2': 'curriculum',
      '3': 'planner',
      '4': 'math',
      '5': 'programming',
      '6': 'problem-solving',
      '7': 'board',
      '8': 'knowledge-base',
      '9': 'analytics',
    };

    if (navMap[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
      navigate(navMap[e.key]);
    }
  });
}

function setupMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const overlay = document.getElementById('mobile-nav-overlay');

  if (menuBtn) {
    menuBtn.addEventListener('click', toggleMobileMenu);
  }
  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }
}

function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobile-nav-overlay');
  if (sidebar) sidebar.classList.toggle('mobile-open');
  if (overlay) overlay.classList.toggle('active');
}

function closeMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobile-nav-overlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
}

// ─── Start the app ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
