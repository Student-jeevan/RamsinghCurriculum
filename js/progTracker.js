/**
 * progTracker.js — Python Programming Tracker Module
 * 
 * Stats row: Exercises Done, Projects Completed, Bugs Debugged, Code Quality Score
 * 
 * Tab 1: Learning Roadmap — visual timeline of Python modules
 * Tab 2: Exercises & Projects — add/manage exercises and projects
 * Tab 3: Debug Log — record and review debugging practice
 * Tab 4: Code Quality — checklist of best practices with progress
 * 
 * @module progTracker
 */

import { store } from './store.js';
import { getDefaultProgExtra } from './data.js';
import {
  generateId, formatDate, getToday, sanitizeHTML, showToast
} from './utils.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let activeTab = 'roadmap';            // 'roadmap' | 'exercises' | 'debug' | 'quality'
let showAddExercise = false;
let showAddProject = false;
let showAddBug = false;
let exerciseSort = 'default';         // 'default' | 'difficulty'
let boundListeners = [];

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

const ICON = {
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>',
  bug: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 9V4M12 15v5M9 12H4M15 12h5M7.05 7.05L4.22 4.22M16.95 7.05l2.83-2.83M7.05 16.95l-2.83 2.83M16.95 16.95l2.83 2.83"/></svg>',
  roadmapDot: '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="currentColor" stroke="var(--bg-primary, #fff)" stroke-width="2"/></svg>',
  sort: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h12M3 18h6"/></svg>',
};

/* ------------------------------------------------------------------ */
/*  Data Access                                                        */
/* ------------------------------------------------------------------ */

/** Get the programming track from curriculum */
function getProgTrack() {
  const curriculum = store.get('curriculum');
  if (!curriculum || !curriculum.tracks) return null;
  return curriculum.tracks.find((t) => t.id === 'programming') || null;
}

/** Get programming extra data */
function getProgExtra() {
  return store.get('prog_extra') || getDefaultProgExtra();
}

/** Save programming extra data */
function saveProgExtra(data) {
  store.set('prog_extra', data);
}

/* ------------------------------------------------------------------ */
/*  Stat Computations                                                  */
/* ------------------------------------------------------------------ */

function computeStats() {
  const extra = getProgExtra();

  const exercises = extra.exercises || [];
  const exercisesDone = exercises.filter((e) => e.completed).length;

  const projects = extra.projects || [];
  const projectsCompleted = projects.filter((p) => p.completed).length;

  const debugLog = extra.debugLog || [];
  const bugsDebugged = debugLog.length;

  const codeQuality = extra.codeQuality || [];
  const qualityTotal = codeQuality.length;
  const qualityChecked = codeQuality.filter((c) => c.checked).length;
  const qualityScore = qualityTotal > 0 ? Math.round((qualityChecked / qualityTotal) * 100) : 0;

  return { exercisesDone, projectsCompleted, bugsDebugged, qualityScore };
}

/* ------------------------------------------------------------------ */
/*  Render: Stats Row                                                  */
/* ------------------------------------------------------------------ */

function renderStats() {
  const { exercisesDone, projectsCompleted, bugsDebugged, qualityScore } = computeStats();

  return `
    <div class="tracker-stats grid grid-4">
      <div class="stat-card">
        <div class="stat-value">${exercisesDone}</div>
        <div class="stat-label">Exercises Done</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${projectsCompleted}</div>
        <div class="stat-label">Projects Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${bugsDebugged}</div>
        <div class="stat-label">Bugs Debugged</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${qualityScore}%</div>
        <div class="stat-label">Code Quality Score</div>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Render: Tab 1 — Learning Roadmap                                   */
/* ------------------------------------------------------------------ */

function renderRoadmapTab() {
  const track = getProgTrack();

  if (!track || !track.modules) {
    return '<div class="empty-state"><div class="empty-icon">🗺️</div><div class="empty-text">No programming curriculum loaded</div></div>';
  }

  const modules = track.modules || [];

  // Determine module statuses based on topic completion
  const moduleStatuses = modules.map((mod) => {
    let totalTopics = 0;
    let masteredTopics = 0;
    let anyLearning = false;

    (mod.chapters || []).forEach((ch) => {
      (ch.topics || []).forEach((t) => {
        totalTopics++;
        if (t.status === 'mastered') masteredTopics++;
        if (t.status === 'learning' || t.status === 'revision') anyLearning = true;
      });
    });

    if (totalTopics > 0 && masteredTopics === totalTopics) return 'completed';
    if (anyLearning || masteredTopics > 0) return 'active';
    return 'upcoming';
  });

  const items = modules.map((mod, idx) => {
    const status = moduleStatuses[idx];
    const statusClass = status === 'completed' ? 'completed' : status === 'active' ? 'active' : '';

    // Count topics
    let topicCount = 0;
    (mod.chapters || []).forEach((ch) => {
      topicCount += (ch.topics || []).length;
    });

    const statusBadge = status === 'completed'
      ? '<span class="badge badge-mastered">Completed</span>'
      : status === 'active'
      ? '<span class="badge badge-learning">In Progress</span>'
      : '<span class="badge badge-not-started">Upcoming</span>';

    return `
      <div class="roadmap-item ${statusClass}">
        <div class="roadmap-line"></div>
        <div class="flex" style="gap:1rem;align-items:flex-start">
          <div style="flex-shrink:0;margin-top:2px;color:${status === 'completed' ? 'var(--success, #2ecc71)' : status === 'active' ? 'var(--primary, #6c5ce7)' : 'var(--text-secondary, #888)'}">
            ${ICON.roadmapDot}
          </div>
          <div style="flex:1">
            <div class="flex-between" style="margin-bottom:0.25rem">
              <strong>${sanitizeHTML(mod.title || mod.name || `Module ${idx + 1}`)}</strong>
              ${statusBadge}
            </div>
            <div style="font-size:0.85rem;opacity:0.75;margin-bottom:0.25rem">${sanitizeHTML(mod.description || '')}</div>
            <div style="font-size:0.8rem;opacity:0.6">${topicCount} topic${topicCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="roadmap-timeline">${items}</div>`;
}

/* ------------------------------------------------------------------ */
/*  Render: Tab 2 — Exercises & Projects                               */
/* ------------------------------------------------------------------ */

function renderExercisesTab() {
  const extra = getProgExtra();
  let exercises = [...(extra.exercises || [])];
  const projects = extra.projects || [];

  // Sort exercises by difficulty if requested
  const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
  if (exerciseSort === 'difficulty') {
    exercises.sort((a, b) => (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2));
  }

  // Exercises section
  const exerciseItems = exercises.map((ex) => {
    const diffClass = `difficulty-${ex.difficulty || 'medium'}`;
    return `
      <div class="list-item" data-exercise-id="${ex.id}" style="display:flex;align-items:center;justify-content:space-between">
        <div class="flex" style="gap:0.75rem;align-items:center;flex:1;min-width:0">
          <label class="checkbox-wrapper">
            <input type="checkbox" class="exercise-checkbox" data-exercise-id="${ex.id}" ${ex.completed ? 'checked' : ''}>
            <span class="checkbox-custom">${ICON.check}</span>
          </label>
          <div class="list-item-content" style="min-width:0">
            <div class="list-item-title ${ex.completed ? 'line-through' : ''}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sanitizeHTML(ex.title)}</div>
          </div>
        </div>
        <div class="flex" style="gap:0.5rem;align-items:center;flex-shrink:0">
          <span class="difficulty-tag ${diffClass}">${(ex.difficulty || 'medium').charAt(0).toUpperCase() + (ex.difficulty || 'medium').slice(1)}</span>
          <span class="badge ${ex.completed ? 'badge-mastered' : 'badge-not-started'}">${ex.completed ? 'Done' : 'Todo'}</span>
          <button class="btn btn-icon btn-ghost exercise-delete" data-exercise-id="${ex.id}" aria-label="Delete">${ICON.x}</button>
        </div>
      </div>
    `;
  }).join('');

  const addExerciseForm = showAddExercise ? `
    <div class="card" style="margin-top:0.75rem">
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="input" id="new-exercise-title" placeholder="Exercise title">
        </div>
        <div class="form-group">
          <label class="form-label">Difficulty</label>
          <select class="select" id="new-exercise-difficulty">
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div class="flex" style="gap:0.5rem;margin-top:0.5rem">
          <button class="btn btn-primary btn-sm" id="save-exercise">Save</button>
          <button class="btn btn-ghost btn-sm" id="cancel-exercise">Cancel</button>
        </div>
      </div>
    </div>
  ` : '';

  // Projects section
  const projectItems = projects.map((proj) => `
    <div class="list-item" data-project-id="${proj.id}" style="display:flex;align-items:center;justify-content:space-between">
      <div class="flex" style="gap:0.75rem;align-items:center;flex:1;min-width:0">
        <label class="checkbox-wrapper">
          <input type="checkbox" class="project-checkbox" data-project-id="${proj.id}" ${proj.completed ? 'checked' : ''}>
          <span class="checkbox-custom">${ICON.check}</span>
        </label>
        <div class="list-item-content" style="min-width:0">
          <div class="list-item-title ${proj.completed ? 'line-through' : ''}">${sanitizeHTML(proj.title)}</div>
          ${proj.description ? `<div class="list-item-meta">${sanitizeHTML(proj.description)}</div>` : ''}
        </div>
      </div>
      <div class="flex" style="gap:0.5rem;align-items:center;flex-shrink:0">
        ${proj.difficulty ? `<span class="difficulty-tag difficulty-${proj.difficulty}">${proj.difficulty.charAt(0).toUpperCase() + proj.difficulty.slice(1)}</span>` : ''}
        <span class="badge ${proj.completed ? 'badge-mastered' : 'badge-learning'}">${proj.completed ? 'Done' : 'In Progress'}</span>
      </div>
    </div>
  `).join('');

  const addProjectForm = showAddProject ? `
    <div class="card" style="margin-top:0.75rem">
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="input" id="new-project-title" placeholder="Project title">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" class="input" id="new-project-desc" placeholder="Brief description">
        </div>
        <div class="form-group">
          <label class="form-label">Difficulty</label>
          <select class="select" id="new-project-difficulty">
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div class="flex" style="gap:0.5rem;margin-top:0.5rem">
          <button class="btn btn-primary btn-sm" id="save-project">Save</button>
          <button class="btn btn-ghost btn-sm" id="cancel-project">Cancel</button>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <!-- Exercises Section -->
    <div class="card" style="margin-bottom:1rem">
      <div class="card-header">
        <div class="card-title">Exercises</div>
        <div class="flex" style="gap:0.5rem">
          <button class="btn btn-ghost btn-sm exercise-sort-btn" title="Sort by difficulty">${ICON.sort} ${exerciseSort === 'difficulty' ? 'Default Order' : 'Sort by Difficulty'}</button>
          <button class="btn btn-primary btn-sm" id="toggle-add-exercise">${ICON.plus} Add Exercise</button>
        </div>
      </div>
      <div class="card-body">
        ${exerciseItems || '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">No exercises yet</div></div>'}
        ${addExerciseForm}
      </div>
    </div>

    <!-- Projects Section -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Mini Projects</div>
        <button class="btn btn-primary btn-sm" id="toggle-add-project">${ICON.plus} Add Project</button>
      </div>
      <div class="card-body">
        ${projectItems || '<div class="empty-state"><div class="empty-icon">🚀</div><div class="empty-text">No projects yet</div></div>'}
        ${addProjectForm}
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Render: Tab 3 — Debug Log                                          */
/* ------------------------------------------------------------------ */

function renderDebugTab() {
  const extra = getProgExtra();
  const debugLog = [...(extra.debugLog || [])].sort((a, b) => {
    // Reverse chronological
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  });

  const bugTypeColors = {
    logic: 'var(--warning, #f39c12)',
    syntax: 'var(--info, #3498db)',
    runtime: 'var(--danger, #e74c3c)',
    performance: 'var(--success, #2ecc71)',
  };

  const entries = debugLog.map((entry) => `
    <div class="list-item" style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">
      <div class="flex" style="gap:0.75rem;align-items:flex-start;flex:1;min-width:0">
        <div style="flex-shrink:0;color:${bugTypeColors[entry.bugType] || 'var(--text-secondary)'};margin-top:2px">${ICON.bug}</div>
        <div class="list-item-content" style="min-width:0">
          <div class="list-item-title">${sanitizeHTML(entry.description)}</div>
          <div class="list-item-meta" style="margin-top:0.25rem">
            <span class="badge" style="background:${bugTypeColors[entry.bugType] || 'var(--text-secondary)'};color:#fff;font-size:0.7rem">${sanitizeHTML((entry.bugType || 'other').toUpperCase())}</span>
            <span style="margin-left:0.5rem">${sanitizeHTML(entry.date)}</span>
          </div>
          ${entry.resolution ? `<div style="margin-top:0.5rem;font-size:0.85rem;opacity:0.85"><strong>Resolution:</strong> ${sanitizeHTML(entry.resolution)}</div>` : ''}
        </div>
      </div>
      <button class="btn btn-icon btn-ghost debug-delete" data-debug-id="${entry.id}" aria-label="Delete">${ICON.x}</button>
    </div>
  `).join('');

  const addBugForm = showAddBug ? `
    <div class="card" style="margin-top:1rem">
      <div class="card-body">
        <div class="grid grid-2" style="gap:0.75rem">
          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" class="input" id="new-bug-date" value="${getToday()}">
          </div>
          <div class="form-group">
            <label class="form-label">Bug Type</label>
            <select class="select" id="new-bug-type">
              <option value="logic">Logic</option>
              <option value="syntax">Syntax</option>
              <option value="runtime">Runtime</option>
              <option value="performance">Performance</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="textarea" id="new-bug-desc" rows="2" placeholder="Describe the bug…"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Resolution</label>
          <textarea class="textarea" id="new-bug-resolution" rows="2" placeholder="How did you fix it?"></textarea>
        </div>
        <div class="flex" style="gap:0.5rem;margin-top:0.5rem">
          <button class="btn btn-primary btn-sm" id="save-bug">Save Entry</button>
          <button class="btn btn-ghost btn-sm" id="cancel-bug">Cancel</button>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <div class="flex-between" style="margin-bottom:1rem">
      <div style="font-size:0.9rem;opacity:0.7">${debugLog.length} entries logged</div>
      <button class="btn btn-primary btn-sm" id="toggle-add-bug">${ICON.plus} Log New Bug</button>
    </div>
    ${addBugForm}
    <div class="card">
      <div class="card-body" style="padding:0">
        ${entries || '<div class="empty-state" style="padding:2rem"><div class="empty-icon">🐛</div><div class="empty-text">No debug entries yet. Start logging your debugging practice!</div></div>'}
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Render: Tab 4 — Code Quality                                       */
/* ------------------------------------------------------------------ */

function renderQualityTab() {
  const extra = getProgExtra();
  const codeQuality = extra.codeQuality || [];
  const total = codeQuality.length;
  const checked = codeQuality.filter((c) => c.checked).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  const items = codeQuality.map((item) => `
    <div class="checklist-item" style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0">
      <label class="checkbox-wrapper">
        <input type="checkbox" class="quality-checkbox" data-quality-id="${item.id}" ${item.checked ? 'checked' : ''}>
        <span class="checkbox-custom">${ICON.check}</span>
      </label>
      <span class="checkbox-label ${item.checked ? 'line-through' : ''}" style="flex:1">${sanitizeHTML(item.description)}</span>
    </div>
  `).join('');

  return `
    <!-- Progress bar -->
    <div class="card" style="margin-bottom:1rem">
      <div class="card-body">
        <div class="flex-between" style="margin-bottom:0.5rem">
          <span style="font-weight:600">Code Quality Progress</span>
          <span class="progress-text" style="font-weight:700">${pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:0.8rem;opacity:0.6;margin-top:0.5rem">${checked} of ${total} practices adopted</div>
      </div>
    </div>

    <!-- Checklist -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Code Quality Practices</div>
      </div>
      <div class="card-body">
        <div class="checklist">
          ${items || '<div class="empty-state"><div class="empty-text">No quality items defined</div></div>'}
        </div>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function render() {
  return `
    <div class="page" id="prog-tracker-page">
      <div class="page-header">
        <h1 class="page-title">🐍 Python Programming Tracker</h1>
      </div>

      ${renderStats()}

      <div class="tabs">
        <button class="tab ${activeTab === 'roadmap' ? 'active' : ''}" data-tab="roadmap">Learning Roadmap</button>
        <button class="tab ${activeTab === 'exercises' ? 'active' : ''}" data-tab="exercises">Exercises & Projects</button>
        <button class="tab ${activeTab === 'debug' ? 'active' : ''}" data-tab="debug">Debug Log</button>
        <button class="tab ${activeTab === 'quality' ? 'active' : ''}" data-tab="quality">Code Quality</button>
      </div>

      <div class="tab-content page-content">
        <div class="tab-pane ${activeTab === 'roadmap' ? 'active' : ''}" id="prog-tab-roadmap">
          ${renderRoadmapTab()}
        </div>
        <div class="tab-pane ${activeTab === 'exercises' ? 'active' : ''}" id="prog-tab-exercises">
          ${renderExercisesTab()}
        </div>
        <div class="tab-pane ${activeTab === 'debug' ? 'active' : ''}" id="prog-tab-debug">
          ${renderDebugTab()}
        </div>
        <div class="tab-pane ${activeTab === 'quality' ? 'active' : ''}" id="prog-tab-quality">
          ${renderQualityTab()}
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const page = document.getElementById('prog-tracker-page');
  if (!page) return;

  /* ---------- Tab switching ---------- */
  const onTabClick = (e) => {
    const tab = e.target.closest('.tab[data-tab]');
    if (!tab || !page.contains(tab)) return;
    activeTab = tab.dataset.tab;
    reRender();
  };
  page.addEventListener('click', onTabClick);
  boundListeners.push(['click', onTabClick, page]);

  /* ---------- Delegated clicks ---------- */
  const onClick = (e) => {
    const target = e.target;

    // ---- Exercises ----

    // Toggle add exercise form
    if (target.closest('#toggle-add-exercise')) {
      showAddExercise = !showAddExercise;
      reRenderPane();
      return;
    }

    // Save exercise
    if (target.closest('#save-exercise')) {
      const titleInput = page.querySelector('#new-exercise-title');
      const diffSelect = page.querySelector('#new-exercise-difficulty');
      const title = titleInput ? titleInput.value.trim() : '';
      const difficulty = diffSelect ? diffSelect.value : 'medium';
      if (!title) { showToast('Please enter a title', 'warning'); return; }
      addExercise(title, difficulty);
      showAddExercise = false;
      reRender();
      showToast('Exercise added!', 'success');
      return;
    }

    // Cancel add exercise
    if (target.closest('#cancel-exercise')) {
      showAddExercise = false;
      reRenderPane();
      return;
    }

    // Delete exercise
    const delEx = target.closest('.exercise-delete');
    if (delEx) {
      deleteExercise(delEx.dataset.exerciseId);
      reRender();
      return;
    }

    // Sort exercises
    if (target.closest('.exercise-sort-btn')) {
      exerciseSort = exerciseSort === 'difficulty' ? 'default' : 'difficulty';
      reRenderPane();
      return;
    }

    // ---- Projects ----

    // Toggle add project form
    if (target.closest('#toggle-add-project')) {
      showAddProject = !showAddProject;
      reRenderPane();
      return;
    }

    // Save project
    if (target.closest('#save-project')) {
      const titleInput = page.querySelector('#new-project-title');
      const descInput = page.querySelector('#new-project-desc');
      const diffSelect = page.querySelector('#new-project-difficulty');
      const title = titleInput ? titleInput.value.trim() : '';
      const description = descInput ? descInput.value.trim() : '';
      const difficulty = diffSelect ? diffSelect.value : 'medium';
      if (!title) { showToast('Please enter a project title', 'warning'); return; }
      addProject(title, description, difficulty);
      showAddProject = false;
      reRender();
      showToast('Project added!', 'success');
      return;
    }

    // Cancel add project
    if (target.closest('#cancel-project')) {
      showAddProject = false;
      reRenderPane();
      return;
    }

    // ---- Debug Log ----

    // Toggle add bug form
    if (target.closest('#toggle-add-bug')) {
      showAddBug = !showAddBug;
      reRenderPane();
      return;
    }

    // Save bug entry
    if (target.closest('#save-bug')) {
      const dateInput = page.querySelector('#new-bug-date');
      const typeSelect = page.querySelector('#new-bug-type');
      const descTextarea = page.querySelector('#new-bug-desc');
      const resTextarea = page.querySelector('#new-bug-resolution');

      const date = dateInput ? dateInput.value : getToday();
      const bugType = typeSelect ? typeSelect.value : 'logic';
      const description = descTextarea ? descTextarea.value.trim() : '';
      const resolution = resTextarea ? resTextarea.value.trim() : '';

      if (!description) { showToast('Please describe the bug', 'warning'); return; }
      addDebugEntry(date, bugType, description, resolution);
      showAddBug = false;
      reRender();
      showToast('Debug entry logged!', 'success');
      return;
    }

    // Cancel add bug
    if (target.closest('#cancel-bug')) {
      showAddBug = false;
      reRenderPane();
      return;
    }

    // Delete debug entry
    const delDebug = target.closest('.debug-delete');
    if (delDebug) {
      deleteDebugEntry(delDebug.dataset.debugId);
      reRender();
      return;
    }
  };
  page.addEventListener('click', onClick);
  boundListeners.push(['click', onClick, page]);

  /* ---------- Change events ---------- */
  const onChange = (e) => {
    const target = e.target;

    // Exercise checkbox
    if (target.classList.contains('exercise-checkbox')) {
      toggleExercise(target.dataset.exerciseId, target.checked);
      reRender();
      return;
    }

    // Project checkbox
    if (target.classList.contains('project-checkbox')) {
      toggleProject(target.dataset.projectId, target.checked);
      reRender();
      return;
    }

    // Code quality checkbox
    if (target.classList.contains('quality-checkbox')) {
      toggleQualityItem(target.dataset.qualityId, target.checked);
      reRender();
      return;
    }
  };
  page.addEventListener('change', onChange);
  boundListeners.push(['change', onChange, page]);
}

export function destroy() {
  boundListeners.forEach(([evt, fn, el]) => {
    if (el) el.removeEventListener(evt, fn);
  });
  boundListeners = [];
  showAddExercise = false;
  showAddProject = false;
  showAddBug = false;
  exerciseSort = 'default';
}

/* ------------------------------------------------------------------ */
/*  Data Mutations                                                     */
/* ------------------------------------------------------------------ */

function addExercise(title, difficulty) {
  const extra = getProgExtra();
  extra.exercises = extra.exercises || [];
  extra.exercises.push({
    id: generateId(),
    title,
    difficulty,
    completed: false,
  });
  saveProgExtra(extra);
}

function deleteExercise(id) {
  const extra = getProgExtra();
  extra.exercises = (extra.exercises || []).filter((e) => e.id !== id);
  saveProgExtra(extra);
}

function toggleExercise(id, completed) {
  const extra = getProgExtra();
  const exercise = (extra.exercises || []).find((e) => e.id === id);
  if (exercise) {
    exercise.completed = completed;
    saveProgExtra(extra);
  }
}

function addProject(title, description, difficulty) {
  const extra = getProgExtra();
  extra.projects = extra.projects || [];
  extra.projects.push({
    id: generateId(),
    title,
    description,
    difficulty,
    completed: false,
  });
  saveProgExtra(extra);
}

function toggleProject(id, completed) {
  const extra = getProgExtra();
  const project = (extra.projects || []).find((p) => p.id === id);
  if (project) {
    project.completed = completed;
    saveProgExtra(extra);
  }
}

function addDebugEntry(date, bugType, description, resolution) {
  const extra = getProgExtra();
  extra.debugLog = extra.debugLog || [];
  extra.debugLog.push({
    id: generateId(),
    date,
    bugType,
    description,
    resolution,
  });
  saveProgExtra(extra);
}

function deleteDebugEntry(id) {
  const extra = getProgExtra();
  extra.debugLog = (extra.debugLog || []).filter((e) => e.id !== id);
  saveProgExtra(extra);
}

function toggleQualityItem(id, checked) {
  const extra = getProgExtra();
  const item = (extra.codeQuality || []).find((c) => c.id === id);
  if (item) {
    item.checked = checked;
    saveProgExtra(extra);
  }
}

/* ------------------------------------------------------------------ */
/*  Re-rendering                                                       */
/* ------------------------------------------------------------------ */

function reRender() {
  const page = document.getElementById('prog-tracker-page');
  if (!page) return;

  // Update stats
  const statsContainer = page.querySelector('.tracker-stats');
  if (statsContainer) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderStats();
    const newStats = tempDiv.querySelector('.tracker-stats');
    if (newStats) statsContainer.replaceWith(newStats);
  }

  // Update tabs
  page.querySelectorAll('.tab[data-tab]').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === activeTab);
  });

  reRenderPane();
}

function reRenderPane() {
  const page = document.getElementById('prog-tracker-page');
  if (!page) return;

  const panes = {
    roadmap: page.querySelector('#prog-tab-roadmap'),
    exercises: page.querySelector('#prog-tab-exercises'),
    debug: page.querySelector('#prog-tab-debug'),
    quality: page.querySelector('#prog-tab-quality'),
  };

  const renderers = {
    roadmap: renderRoadmapTab,
    exercises: renderExercisesTab,
    debug: renderDebugTab,
    quality: renderQualityTab,
  };

  Object.entries(panes).forEach(([key, pane]) => {
    if (!pane) return;
    const isActive = key === activeTab;
    pane.classList.toggle('active', isActive);
    if (isActive && renderers[key]) {
      pane.innerHTML = renderers[key]();
    }
  });
}
