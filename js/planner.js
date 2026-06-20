/**
 * planner.js — Daily Planner & Weekly Review Module
 * 
 * Tab 1: Daily Planner with date navigation and 5 sections
 *   - Today's Objectives (checkable tasks)
 *   - Completed Tasks (auto-populated from checked objectives)
 *   - Difficult Concepts
 *   - Questions for Mentor
 *   - Tomorrow's Plan
 * 
 * Tab 2: Weekly Review with metrics, revision concepts, and reflection
 * 
 * @module planner
 */

import { store } from './store.js';
import {
  generateId, formatDate, getToday, getWeekStart, getWeekNumber,
  debounce, sanitizeHTML, showToast, parseDate, getMonthName, getDayName
} from './utils.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let currentDate = getToday();          // 'YYYY-MM-DD'
let currentWeekOffset = 0;             // 0 = this week, -1 = last week, etc.
let activeTab = 'daily';               // 'daily' | 'weekly'
let boundListeners = [];               // track listeners for cleanup

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Shift currentDate by N days and return new value */
function shiftDate(days) {
  const d = parseDate(currentDate);
  d.setDate(d.getDate() + days);
  currentDate = formatDate(d, 'iso');
  return currentDate;
}

/** Get the Monday–Sunday range string for the current week offset */
function getWeekRange(offset) {
  const today = new Date();
  const dayOfWeek = today.getDay() || 7; // Mon=1 … Sun=7
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1 + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d) => `${getMonthName(d.getMonth()).slice(0, 3)} ${d.getDate()}`;
  return { start: monday, end: sunday, label: `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}` };
}

/** Build a week key like '2026-W25' from a Date */
function weekKeyFromDate(d) {
  return `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Data Access                                                        */
/* ------------------------------------------------------------------ */

function getPlannerData(dateStr) {
  const all = store.get('planner') || {};
  return all[dateStr] || { objectives: [], difficult: [], questions: [], tomorrow: [] };
}

function savePlannerData(dateStr, data) {
  store.update('planner', (all) => {
    all = all || {};
    all[dateStr] = data;
    return all;
  });
}

function getWeeklyData(weekKey) {
  const all = store.get('weekly') || {};
  return all[weekKey] || { codingProblems: 0, miniProjects: 0, revisionConcepts: [], reflection: '' };
}

function saveWeeklyData(weekKey, data) {
  store.update('weekly', (all) => {
    all = all || {};
    all[weekKey] = data;
    return all;
  });
}

/** Sum an activity field across dates in a range */
function sumActivity(startDate, endDate, field) {
  const activity = store.getActivity();
  let sum = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    const key = formatDate(d);
    if (activity[key] && activity[key][field]) {
      sum += activity[key][field];
    }
    d.setDate(d.getDate() + 1);
  }
  return sum;
}

/* ------------------------------------------------------------------ */
/*  Debounced savers                                                   */
/* ------------------------------------------------------------------ */

const debouncedSavePlanner = debounce((dateStr, data) => {
  savePlannerData(dateStr, data);
}, 400);

const debouncedSaveWeekly = debounce((weekKey, data) => {
  saveWeeklyData(weekKey, data);
}, 400);

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

const ICON = {
  chevronLeft: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chevronRight: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>',
};

/* ------------------------------------------------------------------ */
/*  Render Helpers                                                     */
/* ------------------------------------------------------------------ */

function renderDailyTab() {
  const data = getPlannerData(currentDate);
  const dateObj = parseDate(currentDate);
  const dayLabel = `${getDayName(dateObj.getDay())}, ${getMonthName(dateObj.getMonth())} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

  return `
    <!-- Date Navigation -->
    <div class="planner-date">
      <button class="btn btn-icon planner-date-nav" data-dir="prev" aria-label="Previous day">${ICON.chevronLeft}</button>
      <div class="planner-date-display">${dayLabel}</div>
      <button class="btn btn-icon planner-date-nav" data-dir="next" aria-label="Next day">${ICON.chevronRight}</button>
    </div>

    <!-- 1. Today's Objectives -->
    ${renderChecklistSection('objectives', "Today's Objectives", data.objectives, true)}

    <!-- 2. Completed Tasks (auto from checked objectives) -->
    ${renderCompletedSection(data.objectives)}

    <!-- 3. Difficult Concepts -->
    ${renderListSection('difficult', 'Difficult Concepts', data.difficult)}

    <!-- 4. Questions for Mentor -->
    ${renderListSection('questions', 'Questions for Mentor', data.questions)}

    <!-- 5. Tomorrow's Plan -->
    ${renderListSection('tomorrow', "Tomorrow's Plan", data.tomorrow)}
  `;
}

function renderChecklistSection(key, title, items, hasCheckbox) {
  const itemsHTML = items.map((item) => `
    <div class="planner-item" data-section="${key}" data-id="${item.id}">
      ${hasCheckbox ? `
        <label class="checkbox-wrapper">
          <input type="checkbox" class="planner-checkbox" data-section="${key}" data-id="${item.id}" ${item.done ? 'checked' : ''}>
          <span class="checkbox-custom">${ICON.check}</span>
        </label>
      ` : ''}
      <span class="planner-item-text ${item.done ? 'line-through' : ''}">${sanitizeHTML(item.text)}</span>
      <span class="planner-item-actions">
        <button class="btn btn-icon btn-ghost planner-delete" data-section="${key}" data-id="${item.id}" aria-label="Delete">${ICON.x}</button>
      </span>
    </div>
  `).join('');

  return `
    <div class="planner-section" data-section-key="${key}">
      <div class="planner-section-title">${title}</div>
      ${itemsHTML || '<div class="empty-state" style="padding:0.75rem 0"><span class="empty-text">No items yet</span></div>'}
      <div class="planner-add-item">
        <input type="text" class="input planner-input" data-section="${key}" placeholder="Add ${title.toLowerCase()}…">
        <button class="btn btn-primary btn-sm planner-add-btn" data-section="${key}">${ICON.plus}</button>
      </div>
    </div>
  `;
}

function renderCompletedSection(objectives) {
  const completed = objectives.filter((o) => o.done);
  const itemsHTML = completed.map((item) => `
    <div class="planner-item">
      <span class="planner-item-text" style="text-decoration: line-through; opacity:0.7">${sanitizeHTML(item.text)}</span>
    </div>
  `).join('');

  return `
    <div class="planner-section">
      <div class="planner-section-title">Completed Tasks <span class="badge">${completed.length}</span></div>
      ${itemsHTML || '<div class="empty-state" style="padding:0.75rem 0"><span class="empty-text">Complete objectives above to see them here</span></div>'}
    </div>
  `;
}

function renderListSection(key, title, items) {
  const itemsHTML = items.map((item) => `
    <div class="planner-item" data-section="${key}" data-id="${item.id}">
      <span class="planner-item-text">${sanitizeHTML(item.text)}</span>
      <span class="planner-item-actions">
        <button class="btn btn-icon btn-ghost planner-delete" data-section="${key}" data-id="${item.id}" aria-label="Delete">${ICON.x}</button>
      </span>
    </div>
  `).join('');

  return `
    <div class="planner-section" data-section-key="${key}">
      <div class="planner-section-title">${title}</div>
      ${itemsHTML || '<div class="empty-state" style="padding:0.75rem 0"><span class="empty-text">No items yet</span></div>'}
      <div class="planner-add-item">
        <input type="text" class="input planner-input" data-section="${key}" placeholder="Add item…">
        <button class="btn btn-primary btn-sm planner-add-btn" data-section="${key}">${ICON.plus}</button>
      </div>
    </div>
  `;
}

function renderWeeklyTab() {
  const range = getWeekRange(currentWeekOffset);
  const weekKey = weekKeyFromDate(range.start);
  const data = getWeeklyData(weekKey);

  // Compute activity sums
  const hoursStudied = sumActivity(range.start, range.end, 'hours');
  const topicsCompleted = sumActivity(range.start, range.end, 'topicsCompleted');

  // Revision concepts list
  const conceptsHTML = (data.revisionConcepts || []).map((c) => `
    <div class="planner-item" data-id="${c.id}">
      <span class="planner-item-text">${sanitizeHTML(c.text)}</span>
      <span class="planner-item-actions">
        <button class="btn btn-icon btn-ghost weekly-delete-concept" data-id="${c.id}" aria-label="Delete">${ICON.x}</button>
      </span>
    </div>
  `).join('');

  return `
    <!-- Week Navigation -->
    <div class="planner-date">
      <button class="btn btn-icon planner-date-nav" data-dir="prev-week" aria-label="Previous week">${ICON.chevronLeft}</button>
      <div class="planner-date-display">${range.label}</div>
      <button class="btn btn-icon planner-date-nav" data-dir="next-week" aria-label="Next week">${ICON.chevronRight}</button>
    </div>

    <!-- Metrics Grid -->
    <div class="weekly-review-grid">
      <div class="review-metric">
        <div class="review-metric-value">${hoursStudied}</div>
        <div class="review-metric-label">Hours Studied</div>
      </div>
      <div class="review-metric">
        <div class="review-metric-value">${topicsCompleted}</div>
        <div class="review-metric-label">Topics Completed</div>
      </div>
      <div class="review-metric">
        <div class="review-metric-value">
          <div class="counter" data-field="codingProblems">
            <button class="counter-btn" data-action="decrement" aria-label="Decrease">−</button>
            <span class="counter-value">${data.codingProblems}</span>
            <button class="counter-btn" data-action="increment" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="review-metric-label">Coding Problems Solved</div>
      </div>
      <div class="review-metric">
        <div class="review-metric-value">
          <div class="counter" data-field="miniProjects">
            <button class="counter-btn" data-action="decrement" aria-label="Decrease">−</button>
            <span class="counter-value">${data.miniProjects}</span>
            <button class="counter-btn" data-action="increment" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="review-metric-label">Mini Projects Completed</div>
      </div>
    </div>

    <!-- Concepts for Revision -->
    <div class="planner-section" data-section-key="revisionConcepts">
      <div class="planner-section-title">Concepts for Revision</div>
      ${conceptsHTML || '<div class="empty-state" style="padding:0.75rem 0"><span class="empty-text">No revision concepts added</span></div>'}
      <div class="planner-add-item">
        <input type="text" class="input" id="weekly-concept-input" placeholder="Add concept for revision…">
        <button class="btn btn-primary btn-sm" id="weekly-add-concept">${ICON.plus}</button>
      </div>
    </div>

    <!-- Reflection -->
    <div class="reflection-area">
      <label class="form-label" for="weekly-reflection">Weekly Reflection</label>
      <textarea class="textarea" id="weekly-reflection" rows="6" placeholder="How did this week go? What went well? What could be improved?">${sanitizeHTML(data.reflection || '')}</textarea>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * render — return the full page HTML
 */
export function render() {
  return `
    <div class="page" id="planner-page">
      <div class="page-header">
        <h1 class="page-title">📋 Planner</h1>
      </div>

      <div class="tabs">
        <button class="tab ${activeTab === 'daily' ? 'active' : ''}" data-tab="daily">Daily Planner</button>
        <button class="tab ${activeTab === 'weekly' ? 'active' : ''}" data-tab="weekly">Weekly Review</button>
      </div>

      <div class="tab-content page-content">
        <div class="tab-pane ${activeTab === 'daily' ? 'active' : ''}" id="tab-daily">
          ${renderDailyTab()}
        </div>
        <div class="tab-pane ${activeTab === 'weekly' ? 'active' : ''}" id="tab-weekly">
          ${renderWeeklyTab()}
        </div>
      </div>
    </div>
  `;
}

/**
 * init — wire up event listeners via delegation
 */
export function init() {
  const page = document.getElementById('planner-page');
  if (!page) return;

  /* ---------- Tab switching ---------- */
  const onTabClick = (e) => {
    const tab = e.target.closest('.tab[data-tab]');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    reRenderContent();
  };
  page.addEventListener('click', onTabClick);
  boundListeners.push(['click', onTabClick, page]);

  /* ---------- Delegated clicks ---------- */
  const onClick = (e) => {
    const target = e.target;

    // Date navigation
    const navBtn = target.closest('.planner-date-nav');
    if (navBtn) {
      const dir = navBtn.dataset.dir;
      if (dir === 'prev') { shiftDate(-1); reRenderTab('daily'); }
      if (dir === 'next') { shiftDate(1); reRenderTab('daily'); }
      if (dir === 'prev-week') { currentWeekOffset--; reRenderTab('weekly'); }
      if (dir === 'next-week') { currentWeekOffset++; reRenderTab('weekly'); }
      return;
    }

    // Daily: Add item
    const addBtn = target.closest('.planner-add-btn');
    if (addBtn) {
      const section = addBtn.dataset.section;
      const input = page.querySelector(`.planner-input[data-section="${section}"]`);
      if (!input) return;
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      addDailyItem(section, text);
      input.value = '';
      input.focus();
      reRenderTab('daily');
      return;
    }

    // Daily: Delete item
    const delBtn = target.closest('.planner-delete');
    if (delBtn) {
      deleteDailyItem(delBtn.dataset.section, delBtn.dataset.id);
      reRenderTab('daily');
      return;
    }

    // Weekly: counter buttons
    const counterBtn = target.closest('.counter-btn');
    if (counterBtn) {
      const counter = counterBtn.closest('.counter');
      if (!counter) return;
      const field = counter.dataset.field;
      const action = counterBtn.dataset.action;
      updateWeeklyCounter(field, action === 'increment' ? 1 : -1);
      reRenderTab('weekly');
      return;
    }

    // Weekly: Add concept
    if (target.closest('#weekly-add-concept')) {
      const input = page.querySelector('#weekly-concept-input');
      if (!input) return;
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      addWeeklyConcept(text);
      input.value = '';
      input.focus();
      reRenderTab('weekly');
      return;
    }

    // Weekly: Delete concept
    const delConcept = target.closest('.weekly-delete-concept');
    if (delConcept) {
      deleteWeeklyConcept(delConcept.dataset.id);
      reRenderTab('weekly');
      return;
    }
  };
  page.addEventListener('click', onClick);
  boundListeners.push(['click', onClick, page]);

  /* ---------- Checkbox changes ---------- */
  const onChange = (e) => {
    const cb = e.target;
    if (cb.classList.contains('planner-checkbox')) {
      toggleObjective(cb.dataset.id, cb.checked);
      reRenderTab('daily');
    }
  };
  page.addEventListener('change', onChange);
  boundListeners.push(['change', onChange, page]);

  /* ---------- Enter key on inputs ---------- */
  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const input = e.target;

    // Daily inputs
    if (input.classList.contains('planner-input')) {
      const section = input.dataset.section;
      const btn = page.querySelector(`.planner-add-btn[data-section="${section}"]`);
      if (btn) btn.click();
      return;
    }

    // Weekly concept input
    if (input.id === 'weekly-concept-input') {
      const btn = page.querySelector('#weekly-add-concept');
      if (btn) btn.click();
      return;
    }
  };
  page.addEventListener('keydown', onKeyDown);
  boundListeners.push(['keydown', onKeyDown, page]);

  /* ---------- Weekly reflection auto-save ---------- */
  const onInput = (e) => {
    if (e.target.id === 'weekly-reflection') {
      const range = getWeekRange(currentWeekOffset);
      const weekKey = weekKeyFromDate(range.start);
      const data = getWeeklyData(weekKey);
      data.reflection = e.target.value;
      debouncedSaveWeekly(weekKey, data);
    }
  };
  page.addEventListener('input', onInput);
  boundListeners.push(['input', onInput, page]);
}

/**
 * destroy — remove all bound listeners
 */
export function destroy() {
  boundListeners.forEach(([evt, fn, el]) => {
    if (el) el.removeEventListener(evt, fn);
  });
  boundListeners = [];
}

/* ------------------------------------------------------------------ */
/*  Data Mutations                                                     */
/* ------------------------------------------------------------------ */

function addDailyItem(section, text) {
  const data = getPlannerData(currentDate);
  const arr = data[section] || [];
  const newItem = section === 'objectives'
    ? { id: generateId(), text, done: false }
    : { id: generateId(), text };
  arr.push(newItem);
  data[section] = arr;
  savePlannerData(currentDate, data);
}

function deleteDailyItem(section, id) {
  const data = getPlannerData(currentDate);
  data[section] = (data[section] || []).filter((it) => it.id !== id);
  savePlannerData(currentDate, data);
}

function toggleObjective(id, done) {
  const data = getPlannerData(currentDate);
  const item = (data.objectives || []).find((o) => o.id === id);
  if (item) {
    item.done = done;
    savePlannerData(currentDate, data);
  }
}

function updateWeeklyCounter(field, delta) {
  const range = getWeekRange(currentWeekOffset);
  const weekKey = weekKeyFromDate(range.start);
  const data = getWeeklyData(weekKey);
  data[field] = Math.max(0, (data[field] || 0) + delta);
  saveWeeklyData(weekKey, data);
}

function addWeeklyConcept(text) {
  const range = getWeekRange(currentWeekOffset);
  const weekKey = weekKeyFromDate(range.start);
  const data = getWeeklyData(weekKey);
  data.revisionConcepts = data.revisionConcepts || [];
  data.revisionConcepts.push({ id: generateId(), text });
  saveWeeklyData(weekKey, data);
}

function deleteWeeklyConcept(id) {
  const range = getWeekRange(currentWeekOffset);
  const weekKey = weekKeyFromDate(range.start);
  const data = getWeeklyData(weekKey);
  data.revisionConcepts = (data.revisionConcepts || []).filter((c) => c.id !== id);
  saveWeeklyData(weekKey, data);
}

/* ------------------------------------------------------------------ */
/*  Re-rendering helpers                                               */
/* ------------------------------------------------------------------ */

/** Re-render the full content area (tabs + panes) */
function reRenderContent() {
  const page = document.getElementById('planner-page');
  if (!page) return;

  // Update tab active states
  page.querySelectorAll('.tab[data-tab]').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === activeTab);
  });

  // Update pane content and visibility
  const dailyPane = page.querySelector('#tab-daily');
  const weeklyPane = page.querySelector('#tab-weekly');
  if (dailyPane) {
    dailyPane.classList.toggle('active', activeTab === 'daily');
    if (activeTab === 'daily') dailyPane.innerHTML = renderDailyTab();
  }
  if (weeklyPane) {
    weeklyPane.classList.toggle('active', activeTab === 'weekly');
    if (activeTab === 'weekly') weeklyPane.innerHTML = renderWeeklyTab();
  }
}

/** Re-render a specific tab's pane content only */
function reRenderTab(tab) {
  const page = document.getElementById('planner-page');
  if (!page) return;
  if (tab === 'daily') {
    const pane = page.querySelector('#tab-daily');
    if (pane) pane.innerHTML = renderDailyTab();
  } else if (tab === 'weekly') {
    const pane = page.querySelector('#tab-weekly');
    if (pane) pane.innerHTML = renderWeeklyTab();
  }
}
