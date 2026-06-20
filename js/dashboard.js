/**
 * dashboard.js — Main Dashboard Page Module
 * 
 * Shows overall progress, stats, track breakdowns,
 * today's planner tasks, weekly hours chart, and weekly goals.
 */

import { store } from './store.js';
import { getToday, getWeekStart, calculateStreak, sanitizeHTML, showToast, debounce, formatDate, parseDate, getDaysBetween } from './utils.js';
import { getDefaultCurriculum } from './data.js';

/* ------------------------------------------------------------------ */
/*  Private helpers                                                    */
/* ------------------------------------------------------------------ */

/** Get curriculum data (fallback to defaults) */
function getCurriculum() {
  return store.get('curriculum') || getDefaultCurriculum();
}

/** Flatten all topics from every track/module */
function getAllTopics(curriculum) {
  const topics = [];
  for (const track of curriculum.tracks) {
    for (const mod of track.modules) {
      for (const topic of mod.topics) {
        topics.push(topic);
      }
    }
  }
  return topics;
}

/** Count topics by status */
function countByStatus(topics, status) {
  return topics.filter(t => t.status === status).length;
}

/** Compute overall mastered percentage */
function overallPercent(topics) {
  if (topics.length === 0) return 0;
  return Math.round((countByStatus(topics, 'mastered') / topics.length) * 100);
}

/** Per-track stats: { id, name, icon, color, colorRaw, mastered, total, pct } */
function trackStats(curriculum) {
  return curriculum.tracks.map(track => {
    let total = 0;
    let mastered = 0;
    for (const mod of track.modules) {
      for (const topic of mod.topics) {
        total++;
        if (topic.status === 'mastered') mastered++;
      }
    }
    return {
      id: track.id,
      name: track.name,
      icon: track.icon,
      color: track.color,
      colorRaw: track.colorRaw,
      mastered,
      total,
      pct: total === 0 ? 0 : Math.round((mastered / total) * 100)
    };
  });
}

/** Sum hours for the current week (Mon-Sun) from activity data */
function weeklyHoursTotal(activity) {
  const days = weekDays();
  let sum = 0;
  for (const d of days) {
    sum += (activity[d] && activity[d].hours) ? activity[d].hours : 0;
  }
  return sum;
}

/** Returns an array of 7 date strings (YYYY-MM-DD) for Mon-Sun of current week */
function weekDays() {
  const start = getWeekStart(new Date());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(formatDate(d));
  }
  return days;
}

/** Short day labels */
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Compute study streak from activity */
function getStreak(activity) {
  return calculateStreak(activity);
}

/** Build progress ring SVG */
function progressRingSVG(percent) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ≈ 439.82
  const offset = circumference * (1 - percent / 100);

  return `
    <div class="progress-ring-container">
      <svg class="progress-ring" width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="${radius}"
          stroke="var(--border)" stroke-width="10" fill="none" />
        <circle class="progress-ring-circle" cx="90" cy="90" r="${radius}"
          stroke="var(--primary)" stroke-width="10" fill="none"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 90 90)"
          style="transition: stroke-dashoffset 0.8s ease;" />
      </svg>
      <div class="progress-ring-text">
        <span class="progress-ring-value">${percent}%</span>
        <span class="progress-ring-label">Mastered</span>
      </div>
    </div>`;
}

/** Render today's tasks from planner */
function renderTodayTasks() {
  const planner = store.get('planner') || {};
  const today = getToday();
  const entry = planner[today];

  if (!entry || !entry.objectives || entry.objectives.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">No tasks planned for today</div>
        <button class="btn btn-primary btn-sm" data-action="navigate-planner">Plan your day →</button>
      </div>`;
  }

  const items = entry.objectives.map((obj, i) => `
    <div class="task-item" data-index="${i}">
      <label class="checkbox-wrapper">
        <input type="checkbox" ${obj.done ? 'checked' : ''} data-action="toggle-task" data-index="${i}" />
        <span class="checkbox-custom">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>
        </span>
        <span class="checkbox-label" style="${obj.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${sanitizeHTML(obj.text || obj)}</span>
      </label>
    </div>`).join('');

  return `<div class="task-mini-list">${items}</div>`;
}

/** Render weekly hours bar chart */
function renderWeeklyChart(activity) {
  const days = weekDays();
  const hours = days.map(d => (activity[d] && activity[d].hours) ? activity[d].hours : 0);
  const maxH = Math.max(...hours, 1); // avoid divide-by-zero

  const bars = hours.map((h, i) => {
    const heightPct = Math.round((h / maxH) * 100);
    return `
      <div class="hour-bar" style="--bar-height: ${heightPct}%">
        <div class="hour-bar-value" style="height: ${heightPct}%"></div>
        <div class="hour-bar-label">${DAY_LABELS[i]}</div>
      </div>`;
  }).join('');

  return `<div class="weekly-hours">${bars}</div>`;
}

/** Render weekly goals */
function renderWeeklyGoals() {
  const settings = store.getSettings();
  const goals = settings.weeklyGoals || [];

  if (goals.length === 0) {
    return `
      <div class="empty-state" style="padding:1rem">
        <div class="empty-text text-small">No goals yet</div>
      </div>`;
  }

  return goals.map((g, i) => `
    <div class="goal-item" data-goal-index="${i}">
      <label class="checkbox-wrapper">
        <input type="checkbox" ${g.done ? 'checked' : ''} data-action="toggle-goal" data-goal-index="${i}" />
        <span class="checkbox-custom">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>
        </span>
        <span class="checkbox-label" style="${g.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${sanitizeHTML(g.text)}</span>
      </label>
      <button class="btn btn-ghost btn-sm btn-icon" data-action="remove-goal" data-goal-index="${i}" title="Remove">✕</button>
    </div>`).join('');
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Returns the full dashboard HTML */
export function render() {
  const curriculum = getCurriculum();
  const topics = getAllTopics(curriculum);
  const activity = store.getActivity();
  const settings = store.getSettings();
  const streak = getStreak(activity);
  const pct = overallPercent(topics);
  const tracks = trackStats(curriculum);
  const totalTopics = topics.length;
  const masteredCount = countByStatus(topics, 'mastered');
  const weekHours = weeklyHoursTotal(activity);
  const focus = settings.currentFocus || 'Click to set your focus…';

  return `
  <div class="page" id="dashboard-page">
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Track your learning journey</p>
    </div>

    <div class="page-content">

      <!-- ===== Hero Section ===== -->
      <div class="dashboard-hero grid grid-2">
        <!-- Progress Ring Card -->
        <div class="card">
          <div class="card-body flex flex-col flex-center">
            ${progressRingSVG(pct)}
            <div class="streak-display">
              <span class="streak-flame">🔥</span>
              <strong>${streak}</strong> day streak
            </div>
          </div>
        </div>

        <!-- Focus & Hours Card -->
        <div class="card">
          <div class="card-body flex flex-col" style="gap:1.5rem">
            <div class="focus-display">
              <label class="text-muted text-small" style="margin-bottom:0.25rem;display:block">Current Focus</label>
              <div contenteditable="true"
                   class="input"
                   id="focus-input"
                   data-action="update-focus"
                   style="min-height:2.4rem">${sanitizeHTML(focus)}</div>
            </div>
            <div>
              <span class="text-muted text-small">Hours This Week</span>
              <div style="font-size:2rem;font-weight:700;margin-top:0.25rem">${weekHours.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Stats Row ===== -->
      <div class="grid grid-4" style="margin-top:1.5rem">
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-icon">📚</div>
            <div class="stat-value">${totalTopics}</div>
            <div class="stat-label">Total Topics</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-icon">🏆</div>
            <div class="stat-value">${masteredCount}</div>
            <div class="stat-label">Mastered</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">${streak}</div>
            <div class="stat-label">Study Streak</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-icon">⏱️</div>
            <div class="stat-value">${weekHours.toFixed(1)}</div>
            <div class="stat-label">Hours This Week</div>
          </div>
        </div>
      </div>

      <!-- ===== Track Progress ===== -->
      <div class="card" style="margin-top:1.5rem">
        <div class="card-header">
          <h2 class="card-title">Track Progress</h2>
        </div>
        <div class="card-body">
          ${tracks.map(t => `
            <div class="track-progress-item">
              <div class="track-progress-label">
                <span class="track-color-dot" style="background:${t.colorRaw}"></span>
                ${t.icon} ${sanitizeHTML(t.name)}
                <span class="text-muted text-small">${t.mastered}/${t.total}</span>
              </div>
              <div class="track-progress-bar">
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${t.pct}%;background:${t.colorRaw}"></div>
                </div>
              </div>
              <div class="track-progress-pct">${t.pct}%</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- ===== Bottom Grid: Tasks, Hours, Goals ===== -->
      <div class="grid grid-3" style="margin-top:1.5rem">

        <!-- Today's Tasks -->
        <div class="card">
          <div class="card-header flex flex-between">
            <h2 class="card-title">Today's Tasks</h2>
          </div>
          <div class="card-body" id="today-tasks-container">
            ${renderTodayTasks()}
          </div>
        </div>

        <!-- Weekly Hours -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Weekly Hours</h2>
          </div>
          <div class="card-body">
            ${renderWeeklyChart(activity)}
          </div>
        </div>

        <!-- Weekly Goals -->
        <div class="card">
          <div class="card-header flex flex-between">
            <h2 class="card-title">Weekly Goals</h2>
            <button class="btn btn-primary btn-sm" data-action="add-goal">+ Add</button>
          </div>
          <div class="card-body" id="weekly-goals-container">
            ${renderWeeklyGoals()}
          </div>
        </div>

      </div>
    </div>
  </div>`;
}

/** Delegated click / input handler references (stored for cleanup) */
let _onClick = null;
let _onFocusBlur = null;

/** Set up event listeners after HTML is in the DOM */
export function init() {
  const page = document.getElementById('dashboard-page');
  if (!page) return;

  /* ---------- Focus input (contenteditable) ---------- */
  const focusInput = document.getElementById('focus-input');
  if (focusInput) {
    _onFocusBlur = debounce(() => {
      const text = focusInput.textContent.trim();
      store.updateSettings({ currentFocus: text });
    }, 400);
    focusInput.addEventListener('input', _onFocusBlur);
  }

  /* ---------- Event delegation for clicks ---------- */
  _onClick = (e) => {
    const target = e.target;
    const action = target.dataset.action || (target.closest('[data-action]')?.dataset.action);

    if (!action) return;

    /* Toggle planner task checkbox */
    if (action === 'toggle-task') {
      const index = parseInt(target.dataset.index ?? target.closest('[data-index]')?.dataset.index, 10);
      if (Number.isNaN(index)) return;

      const planner = store.get('planner') || {};
      const today = getToday();
      if (!planner[today] || !planner[today].objectives) return;

      const obj = planner[today].objectives[index];
      if (typeof obj === 'string') {
        // Migrate plain string → object
        planner[today].objectives[index] = { text: obj, done: true };
      } else {
        obj.done = !obj.done;
      }
      store.set('planner', planner);

      // Re-render tasks
      const container = document.getElementById('today-tasks-container');
      if (container) container.innerHTML = renderTodayTasks();
    }

    /* Navigate to planner */
    if (action === 'navigate-planner') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'planner' } }));
    }

    /* Toggle weekly goal */
    if (action === 'toggle-goal') {
      const gi = parseInt(target.dataset.goalIndex ?? target.closest('[data-goal-index]')?.dataset.goalIndex, 10);
      if (Number.isNaN(gi)) return;
      const settings = store.getSettings();
      const goals = settings.weeklyGoals || [];
      if (goals[gi]) {
        goals[gi].done = !goals[gi].done;
        store.updateSettings({ weeklyGoals: goals });
        const container = document.getElementById('weekly-goals-container');
        if (container) container.innerHTML = renderWeeklyGoals();
      }
    }

    /* Remove weekly goal */
    if (action === 'remove-goal') {
      const gi = parseInt(target.dataset.goalIndex ?? target.closest('[data-goal-index]')?.dataset.goalIndex, 10);
      if (Number.isNaN(gi)) return;
      const settings = store.getSettings();
      const goals = settings.weeklyGoals || [];
      goals.splice(gi, 1);
      store.updateSettings({ weeklyGoals: goals });
      const container = document.getElementById('weekly-goals-container');
      if (container) container.innerHTML = renderWeeklyGoals();
    }

    /* Add weekly goal */
    if (action === 'add-goal') {
      const text = prompt('Enter a goal:');
      if (!text || !text.trim()) return;
      const settings = store.getSettings();
      const goals = settings.weeklyGoals || [];
      goals.push({ text: text.trim(), done: false });
      store.updateSettings({ weeklyGoals: goals });
      const container = document.getElementById('weekly-goals-container');
      if (container) container.innerHTML = renderWeeklyGoals();
    }
  };

  page.addEventListener('click', _onClick);
}

/** Clean up event listeners */
export function destroy() {
  const page = document.getElementById('dashboard-page');
  if (page && _onClick) page.removeEventListener('click', _onClick);

  const focusInput = document.getElementById('focus-input');
  if (focusInput && _onFocusBlur) focusInput.removeEventListener('input', _onFocusBlur);

  _onClick = null;
  _onFocusBlur = null;
}
