/**
 * mathTracker.js — Mathematics-Specific Tracker Module
 * 
 * Stats row: Total Formulas Memorized, Problems Solved, Chapters Mastered, Concepts Tracked
 * 
 * Tab 1: Chapters & Progress — expandable chapters with topics and problem counters
 * Tab 2: Formula Checklist — filterable grid of formulas with add capability
 * Tab 3: Concept Mastery — visual overview of all math topics with confidence coloring
 * 
 * @module mathTracker
 */

import { store } from './store.js';
import { getDefaultMathExtra } from './data.js';
import {
  generateId, sanitizeHTML, showToast
} from './utils.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let activeTab = 'chapters';           // 'chapters' | 'formulas' | 'mastery'
let expandedChapters = new Set();     // Set of expanded chapter IDs
let formulaFilter = 'all';           // 'all' | 'memorized' | 'not-memorized'
let showAddFormula = false;          // Toggle add formula form
let boundListeners = [];

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

const ICON = {
  chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>',
  star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>',
  starEmpty: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>',
};

/* ------------------------------------------------------------------ */
/*  Data Access                                                        */
/* ------------------------------------------------------------------ */

/** Get the math track from curriculum */
function getMathTrack() {
  const curriculum = store.get('curriculum');
  if (!curriculum || !curriculum.tracks) return null;
  return curriculum.tracks.find((t) => t.id === 'math') || null;
}

/** Get math extra data (problem counts, formulas, etc.) */
function getMathExtra() {
  return store.get('math_extra') || getDefaultMathExtra();
}

/** Save math extra data */
function saveMathExtra(data) {
  store.set('math_extra', data);
}

/* ------------------------------------------------------------------ */
/*  Stat Computations                                                  */
/* ------------------------------------------------------------------ */

function computeStats() {
  const track = getMathTrack();
  const extra = getMathExtra();

  // Total formulas memorized
  const formulas = extra.formulas || [];
  const memorizedCount = formulas.filter((f) => f.memorized).length;

  // Problems solved (sum of all problem counts)
  const problemCounts = extra.problemCounts || {};
  const problemsSolved = Object.values(problemCounts).reduce((s, v) => s + v, 0);

  // Chapters mastered & concept count
  let chaptersTotal = 0;
  let chaptersMastered = 0;
  let conceptCount = 0;

  if (track && track.modules) {
    track.modules.forEach((mod) => {
      if (!mod.chapters) return;
      mod.chapters.forEach((ch) => {
        chaptersTotal++;
        const topics = ch.topics || [];
        conceptCount += topics.length;
        if (topics.length > 0 && topics.every((t) => t.status === 'mastered')) {
          chaptersMastered++;
        }
      });
    });
  }

  return { memorizedCount, problemsSolved, chaptersMastered, conceptCount };
}

/* ------------------------------------------------------------------ */
/*  Render: Stats Row                                                  */
/* ------------------------------------------------------------------ */

function renderStats() {
  const { memorizedCount, problemsSolved, chaptersMastered, conceptCount } = computeStats();

  return `
    <div class="tracker-stats grid grid-4">
      <div class="stat-card">
        <div class="stat-value">${memorizedCount}</div>
        <div class="stat-label">Formulas Memorized</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${problemsSolved}</div>
        <div class="stat-label">Problems Solved</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${chaptersMastered}</div>
        <div class="stat-label">Chapters Mastered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${conceptCount}</div>
        <div class="stat-label">Concepts Tracked</div>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Render: Tab 1 — Chapters & Progress                                */
/* ------------------------------------------------------------------ */

function renderChaptersTab() {
  const track = getMathTrack();
  const extra = getMathExtra();
  const problemCounts = extra.problemCounts || {};

  if (!track || !track.modules) {
    return '<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-text">No math curriculum loaded</div></div>';
  }

  let html = '';

  track.modules.forEach((mod) => {
    html += `<div class="card" style="margin-bottom: 1rem">
      <div class="card-header"><div class="card-title">${sanitizeHTML(mod.title || mod.name || 'Module')}</div></div>
      <div class="card-body">`;

    (mod.chapters || []).forEach((ch) => {
      const topics = ch.topics || [];
      const total = topics.length;
      const mastered = topics.filter((t) => t.status === 'mastered').length;
      const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
      const isExpanded = expandedChapters.has(ch.id);
      const count = problemCounts[ch.id] || 0;

      html += `
        <div class="tracker-card">
          <div class="tracker-card-header chapter-toggle" data-chapter-id="${ch.id}" style="cursor:pointer">
            <div class="flex" style="align-items:center;gap:0.5rem">
              <span class="expand-icon">${isExpanded ? ICON.chevronDown : ICON.chevronRight}</span>
              <strong>${sanitizeHTML(ch.name || ch.title || 'Chapter')}</strong>
            </div>
            <div class="flex" style="align-items:center;gap:1rem">
              <div class="progress-bar" style="width:120px">
                <div class="progress-fill" style="width:${pct}%"></div>
              </div>
              <span class="progress-text">${pct}%</span>
              <div class="counter" data-chapter-id="${ch.id}">
                <button class="counter-btn problem-counter" data-chapter-id="${ch.id}" data-action="decrement" aria-label="Decrease problems">−</button>
                <span class="counter-value">${count}</span>
                <button class="counter-btn problem-counter" data-chapter-id="${ch.id}" data-action="increment" aria-label="Increase problems">+</button>
              </div>
              <span style="font-size:0.75rem;opacity:0.7">problems</span>
            </div>
          </div>
          ${isExpanded ? renderChapterTopics(ch) : ''}
        </div>
      `;
    });

    html += `</div></div>`;
  });

  return html;
}

function renderChapterTopics(ch) {
  const topics = ch.topics || [];
  if (topics.length === 0) {
    return '<div class="tracker-card-body"><div class="empty-text">No topics</div></div>';
  }

  const rows = topics.map((t) => {
    const statusClass = `badge-${t.status || 'not-started'}`;
    const statusLabel = (t.status || 'not-started').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return `
      <div class="list-item" style="display:flex;align-items:center;justify-content:space-between">
        <div class="list-item-content">
          <div class="list-item-title">${sanitizeHTML(t.name || t.title || 'Topic')}</div>
        </div>
        <div class="flex" style="gap:0.5rem;align-items:center">
          <select class="select topic-status-select" data-chapter-id="${ch.id}" data-topic-id="${t.id}" style="font-size:0.8rem;padding:0.25rem 0.5rem">
            <option value="not-started" ${t.status === 'not-started' ? 'selected' : ''}>Not Started</option>
            <option value="learning" ${t.status === 'learning' ? 'selected' : ''}>Learning</option>
            <option value="revision" ${t.status === 'revision' ? 'selected' : ''}>Revision</option>
            <option value="mastered" ${t.status === 'mastered' ? 'selected' : ''}>Mastered</option>
          </select>
          <span class="badge ${statusClass}">${statusLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="tracker-card-body">${rows}</div>`;
}

/* ------------------------------------------------------------------ */
/*  Render: Tab 2 — Formula Checklist                                  */
/* ------------------------------------------------------------------ */

function renderFormulasTab() {
  const extra = getMathExtra();
  let formulas = extra.formulas || [];

  // Apply filter
  if (formulaFilter === 'memorized') formulas = formulas.filter((f) => f.memorized);
  if (formulaFilter === 'not-memorized') formulas = formulas.filter((f) => !f.memorized);

  const totalFormulas = (extra.formulas || []).length;
  const memorizedTotal = (extra.formulas || []).filter((f) => f.memorized).length;

  const filterBtns = ['all', 'memorized', 'not-memorized'].map((f) => {
    const label = f === 'all' ? 'All' : f === 'memorized' ? 'Memorized' : 'Not Memorized';
    return `<button class="btn ${formulaFilter === f ? 'btn-primary' : 'btn-secondary'} btn-sm formula-filter-btn" data-filter="${f}">${label}</button>`;
  }).join('');

  const gridItems = formulas.map((f) => `
    <div class="formula-item" data-formula-id="${f.id}">
      <label class="checkbox-wrapper" style="align-self:start;margin-top:2px">
        <input type="checkbox" class="formula-checkbox" data-formula-id="${f.id}" ${f.memorized ? 'checked' : ''}>
        <span class="checkbox-custom">${ICON.check}</span>
      </label>
      <div>
        <div style="font-weight:600">${sanitizeHTML(f.name)}</div>
        <div style="font-size:0.85rem;opacity:0.8;margin-top:2px">${sanitizeHTML(f.formula)}</div>
      </div>
      <button class="btn btn-icon btn-ghost formula-delete" data-formula-id="${f.id}" aria-label="Delete formula" style="margin-left:auto">${ICON.x}</button>
    </div>
  `).join('');

  // Add formula form
  const addFormHTML = showAddFormula ? `
    <div class="card" style="margin-top:1rem">
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Formula Name</label>
          <input type="text" class="input" id="new-formula-name" placeholder="e.g., Quadratic Formula">
        </div>
        <div class="form-group">
          <label class="form-label">Formula Text</label>
          <input type="text" class="input" id="new-formula-text" placeholder="e.g., x = (-b ± √(b²-4ac)) / 2a">
        </div>
        <div class="flex" style="gap:0.5rem;margin-top:0.75rem">
          <button class="btn btn-primary btn-sm" id="save-formula">Save Formula</button>
          <button class="btn btn-ghost btn-sm" id="cancel-formula">Cancel</button>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <div class="flex-between" style="margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
      <div class="flex" style="gap:0.5rem">${filterBtns}</div>
      <div class="flex" style="gap:0.75rem;align-items:center">
        <span style="font-size:0.85rem;opacity:0.7">${memorizedTotal}/${totalFormulas} memorized</span>
        <button class="btn btn-primary btn-sm" id="toggle-add-formula">${ICON.plus} Add Formula</button>
      </div>
    </div>
    ${addFormHTML}
    <div class="formula-grid">
      ${gridItems || '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">No formulas found</div></div>'}
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Render: Tab 3 — Concept Mastery                                    */
/* ------------------------------------------------------------------ */

function renderMasteryTab() {
  const track = getMathTrack();
  if (!track || !track.modules) {
    return '<div class="empty-state"><div class="empty-icon">🧠</div><div class="empty-text">No math curriculum loaded</div></div>';
  }

  let html = '';

  track.modules.forEach((mod) => {
    html += `<div class="card" style="margin-bottom:1rem">
      <div class="card-header"><div class="card-title">${sanitizeHTML(mod.title || mod.name || 'Module')}</div></div>
      <div class="card-body">`;

    (mod.chapters || []).forEach((ch) => {
      (ch.topics || []).forEach((topic) => {
        const confidence = topic.confidence || 0;
        const colorClass = confidence === 0 ? 'var(--text-secondary, #888)'
          : confidence <= 2 ? 'var(--danger, #e74c3c)'
          : confidence <= 3 ? 'var(--warning, #f39c12)'
          : 'var(--success, #2ecc71)';

        const stars = Array.from({ length: 5 }, (_, i) =>
          `<span class="mastery-star" data-topic-id="${topic.id}" data-chapter-id="${ch.id}" data-star="${i + 1}" style="cursor:pointer;color:${i < confidence ? colorClass : 'var(--text-secondary, #888)'}">${i < confidence ? ICON.star : ICON.starEmpty}</span>`
        ).join('');

        const pct = Math.round((confidence / 5) * 100);

        html += `
          <div class="list-item" style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem">
            <div class="list-item-content" style="flex:1;min-width:0">
              <div class="list-item-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitizeHTML(topic.name || topic.title || 'Topic')}</div>
              <div class="list-item-meta">${sanitizeHTML(ch.name || ch.title || '')}</div>
            </div>
            <div class="flex" style="gap:0.25rem;align-items:center;flex-shrink:0">
              ${stars}
            </div>
            <div class="progress-bar" style="width:60px;flex-shrink:0">
              <div class="progress-fill" style="width:${pct}%;background:${colorClass}"></div>
            </div>
          </div>
        `;
      });
    });

    html += `</div></div>`;
  });

  return html;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function render() {
  return `
    <div class="page" id="math-tracker-page">
      <div class="page-header">
        <h1 class="page-title">🔢 Mathematics Tracker</h1>
      </div>

      ${renderStats()}

      <div class="tabs">
        <button class="tab ${activeTab === 'chapters' ? 'active' : ''}" data-tab="chapters">Chapters & Progress</button>
        <button class="tab ${activeTab === 'formulas' ? 'active' : ''}" data-tab="formulas">Formula Checklist</button>
        <button class="tab ${activeTab === 'mastery' ? 'active' : ''}" data-tab="mastery">Concept Mastery</button>
      </div>

      <div class="tab-content page-content">
        <div class="tab-pane ${activeTab === 'chapters' ? 'active' : ''}" id="math-tab-chapters">
          ${renderChaptersTab()}
        </div>
        <div class="tab-pane ${activeTab === 'formulas' ? 'active' : ''}" id="math-tab-formulas">
          ${renderFormulasTab()}
        </div>
        <div class="tab-pane ${activeTab === 'mastery' ? 'active' : ''}" id="math-tab-mastery">
          ${renderMasteryTab()}
        </div>
      </div>
    </div>
  `;
}

export function init() {
  const page = document.getElementById('math-tracker-page');
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

    // Chapter expand/collapse (but not if clicking counter button)
    if (target.closest('.problem-counter')) {
      // handled below
    } else {
      const toggle = target.closest('.chapter-toggle');
      if (toggle) {
        const chId = toggle.dataset.chapterId;
        if (expandedChapters.has(chId)) {
          expandedChapters.delete(chId);
        } else {
          expandedChapters.add(chId);
        }
        reRenderPane();
        return;
      }
    }

    // Problem counter +/-
    const counterBtn = target.closest('.problem-counter');
    if (counterBtn) {
      e.stopPropagation(); // prevent chapter toggle
      const chId = counterBtn.dataset.chapterId;
      const delta = counterBtn.dataset.action === 'increment' ? 1 : -1;
      updateProblemCount(chId, delta);
      reRender(); // re-render stats + pane
      return;
    }

    // Formula filter
    const filterBtn = target.closest('.formula-filter-btn');
    if (filterBtn) {
      formulaFilter = filterBtn.dataset.filter;
      reRenderPane();
      return;
    }

    // Toggle add formula form
    if (target.closest('#toggle-add-formula')) {
      showAddFormula = !showAddFormula;
      reRenderPane();
      return;
    }

    // Save formula
    if (target.closest('#save-formula')) {
      const nameInput = page.querySelector('#new-formula-name');
      const textInput = page.querySelector('#new-formula-text');
      const name = nameInput ? nameInput.value.trim() : '';
      const formula = textInput ? textInput.value.trim() : '';
      if (!name || !formula) {
        showToast('Please fill in both name and formula', 'warning');
        return;
      }
      addFormula(name, formula);
      showAddFormula = false;
      reRender();
      showToast('Formula added!', 'success');
      return;
    }

    // Cancel add formula
    if (target.closest('#cancel-formula')) {
      showAddFormula = false;
      reRenderPane();
      return;
    }

    // Delete formula
    const delFormula = target.closest('.formula-delete');
    if (delFormula) {
      deleteFormula(delFormula.dataset.formulaId);
      reRender();
      return;
    }

    // Mastery star click
    const star = target.closest('.mastery-star');
    if (star) {
      const topicId = star.dataset.topicId;
      const chapterId = star.dataset.chapterId;
      const level = parseInt(star.dataset.star, 10);
      setTopicConfidence(chapterId, topicId, level);
      reRenderPane();
      return;
    }
  };
  page.addEventListener('click', onClick);
  boundListeners.push(['click', onClick, page]);

  /* ---------- Change events (checkboxes, selects) ---------- */
  const onChange = (e) => {
    const target = e.target;

    // Formula checkbox
    if (target.classList.contains('formula-checkbox')) {
      toggleFormulaMemorized(target.dataset.formulaId, target.checked);
      reRender(); // updates stats too
      return;
    }

    // Topic status select
    if (target.classList.contains('topic-status-select')) {
      setTopicStatus(target.dataset.chapterId, target.dataset.topicId, target.value);
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
  expandedChapters.clear();
  showAddFormula = false;
  formulaFilter = 'all';
}

/* ------------------------------------------------------------------ */
/*  Data Mutations                                                     */
/* ------------------------------------------------------------------ */

function updateProblemCount(chapterId, delta) {
  const extra = getMathExtra();
  extra.problemCounts = extra.problemCounts || {};
  extra.problemCounts[chapterId] = Math.max(0, (extra.problemCounts[chapterId] || 0) + delta);
  saveMathExtra(extra);
}

function toggleFormulaMemorized(formulaId, memorized) {
  const extra = getMathExtra();
  const formula = (extra.formulas || []).find((f) => f.id === formulaId);
  if (formula) {
    formula.memorized = memorized;
    saveMathExtra(extra);
  }
}

function addFormula(name, formula) {
  const extra = getMathExtra();
  extra.formulas = extra.formulas || [];
  extra.formulas.push({ id: generateId(), name, formula, memorized: false });
  saveMathExtra(extra);
}

function deleteFormula(formulaId) {
  const extra = getMathExtra();
  extra.formulas = (extra.formulas || []).filter((f) => f.id !== formulaId);
  saveMathExtra(extra);
}

function setTopicStatus(chapterId, topicId, status) {
  const curriculum = store.get('curriculum');
  if (!curriculum || !curriculum.tracks) return;

  const track = curriculum.tracks.find((t) => t.id === 'math');
  if (!track) return;

  for (const mod of (track.modules || [])) {
    for (const ch of (mod.chapters || [])) {
      if (ch.id === chapterId) {
        const topic = (ch.topics || []).find((t) => t.id === topicId);
        if (topic) {
          topic.status = status;
          store.set('curriculum', curriculum);
          return;
        }
      }
    }
  }
}

function setTopicConfidence(chapterId, topicId, level) {
  const curriculum = store.get('curriculum');
  if (!curriculum || !curriculum.tracks) return;

  const track = curriculum.tracks.find((t) => t.id === 'math');
  if (!track) return;

  for (const mod of (track.modules || [])) {
    for (const ch of (mod.chapters || [])) {
      if (ch.id === chapterId) {
        const topic = (ch.topics || []).find((t) => t.id === topicId);
        if (topic) {
          // Toggle: clicking same star level resets to 0
          topic.confidence = topic.confidence === level ? level - 1 : level;
          store.set('curriculum', curriculum);
          return;
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Re-rendering                                                       */
/* ------------------------------------------------------------------ */

function reRender() {
  const page = document.getElementById('math-tracker-page');
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
  const page = document.getElementById('math-tracker-page');
  if (!page) return;

  const panes = {
    chapters: page.querySelector('#math-tab-chapters'),
    formulas: page.querySelector('#math-tab-formulas'),
    mastery: page.querySelector('#math-tab-mastery'),
  };

  Object.entries(panes).forEach(([key, pane]) => {
    if (!pane) return;
    const isActive = key === activeTab;
    pane.classList.toggle('active', isActive);
    if (isActive) {
      if (key === 'chapters') pane.innerHTML = renderChaptersTab();
      if (key === 'formulas') pane.innerHTML = renderFormulasTab();
      if (key === 'mastery') pane.innerHTML = renderMasteryTab();
    }
  });
}
