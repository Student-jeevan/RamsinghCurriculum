/**
 * problemTracker.js
 * Problem solving tracker with log, patterns, mistakes journal, and statistics.
 * ES Module — exports render(), init(), destroy()
 */

import { store } from './store.js';
import { generateId, formatDate, getToday, sanitizeHTML, showToast } from './utils.js';
import { getDefaultProblemExtra } from './data.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Return the canonical data object, falling back to defaults. */
function getData() {
  return store.get('problems_extra') || getDefaultProblemExtra();
}

/** Persist data back to store. */
function saveData(data) {
  store.set('problems_extra', data);
}

/** Compute the four stat values. */
function computeStats(data) {
  const log = data.problemLog || [];
  const totalSolved = log.filter(p => p.result === 'solved').length;
  const successRate = log.length ? Math.round((totalSolved / log.length) * 100) : 0;
  const avgTime = log.length
    ? Math.round(log.reduce((s, p) => s + (p.timeMinutes || 0), 0) / log.length)
    : 0;
  const patternsMastered = (data.patterns || []).filter(p => p.mastered).length;
  return { totalSolved, successRate, avgTime, patternsMastered };
}

/** Result → CSS color class name */
function resultColor(result) {
  if (result === 'solved') return 'color: var(--color-success)';
  if (result === 'partial') return 'color: var(--color-warning)';
  return 'color: var(--color-danger)';
}

/** Difficulty badge markup */
function difficultyTag(diff) {
  const cls = diff === 'easy' ? 'difficulty-easy' : diff === 'medium' ? 'difficulty-medium' : 'difficulty-hard';
  return `<span class="difficulty-tag ${cls}">${diff}</span>`;
}

/* ------------------------------------------------------------------ */
/*  Render                                                            */
/* ------------------------------------------------------------------ */

export function render() {
  const data = getData();
  const stats = computeStats(data);

  return `
<div class="page">
  <div class="page-header">
    <h1 class="page-title">🧩 Problem Tracker</h1>
  </div>

  <div class="page-content">
    <!-- Stats Row -->
    <div class="grid grid-4">
      <div class="stat-card">
        <div class="stat-value">${stats.totalSolved}</div>
        <div class="stat-label">Total Solved</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.successRate}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.avgTime}m</div>
        <div class="stat-label">Avg Time</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.patternsMastered}</div>
        <div class="stat-label">Patterns Mastered</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab active" data-tab="problem-log">Problem Log</button>
      <button class="tab" data-tab="patterns">Patterns</button>
      <button class="tab" data-tab="mistakes">Mistakes Journal</button>
      <button class="tab" data-tab="prob-statistics">Statistics</button>
    </div>

    <div class="tab-content">
      <!-- Tab 1: Problem Log -->
      <div class="tab-pane active" id="tab-problem-log">
        <div class="flex-between" style="margin-bottom:1rem">
          <span style="font-weight:600">Solved Problems</span>
          <button class="btn btn-primary btn-sm" id="btn-add-problem">+ Add Problem</button>
        </div>

        <!-- Inline add form (hidden) -->
        <div class="card" id="problem-form-card" style="display:none;margin-bottom:1rem">
          <div class="card-body">
            <div class="grid grid-2" style="gap:.75rem">
              <div class="form-group">
                <label class="form-label">Title</label>
                <input class="input" id="pf-title" placeholder="Problem name" />
              </div>
              <div class="form-group">
                <label class="form-label">Difficulty</label>
                <select class="select" id="pf-difficulty">
                  <option value="easy">Easy</option>
                  <option value="medium" selected>Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Time (minutes)</label>
                <input class="input" id="pf-time" type="number" min="0" placeholder="30" />
              </div>
              <div class="form-group">
                <label class="form-label">Result</label>
                <select class="select" id="pf-result">
                  <option value="solved">Solved</option>
                  <option value="partial">Partial</option>
                  <option value="unsolved">Unsolved</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-top:.75rem">
              <label class="form-label">Approach / Notes</label>
              <textarea class="textarea" id="pf-approach" rows="2" placeholder="Describe your approach…"></textarea>
            </div>
            <div class="flex-gap" style="margin-top:.75rem">
              <button class="btn btn-primary btn-sm" id="btn-save-problem">Save</button>
              <button class="btn btn-ghost btn-sm" id="btn-cancel-problem">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Problem list -->
        <div id="problem-list">
          ${renderProblemLog(data)}
        </div>
      </div>

      <!-- Tab 2: Patterns -->
      <div class="tab-pane" id="tab-patterns">
        <p style="margin-bottom:1rem;opacity:.8">Track your mastery of common algorithm patterns.</p>
        <div class="grid grid-3" id="patterns-grid">
          ${renderPatterns(data)}
        </div>
      </div>

      <!-- Tab 3: Mistakes Journal -->
      <div class="tab-pane" id="tab-mistakes">
        <div class="flex-between" style="margin-bottom:1rem">
          <span style="font-weight:600">Learn from your mistakes ✨</span>
          <button class="btn btn-primary btn-sm" id="btn-add-mistake">+ Add Entry</button>
        </div>

        <!-- Inline add form (hidden) -->
        <div class="card" id="mistake-form-card" style="display:none;margin-bottom:1rem">
          <div class="card-body">
            <div class="grid grid-2" style="gap:.75rem">
              <div class="form-group">
                <label class="form-label">Problem Name</label>
                <input class="input" id="mf-problem" placeholder="Which problem?" />
              </div>
              <div class="form-group">
                <label class="form-label">Date</label>
                <input class="input" id="mf-date" type="date" value="${getToday()}" />
              </div>
            </div>
            <div class="form-group" style="margin-top:.75rem">
              <label class="form-label">What went wrong?</label>
              <textarea class="textarea" id="mf-wrong" rows="2" placeholder="Describe the mistake…"></textarea>
            </div>
            <div class="form-group" style="margin-top:.75rem">
              <label class="form-label">Lesson Learned</label>
              <textarea class="textarea" id="mf-lesson" rows="2" placeholder="What did you learn?"></textarea>
            </div>
            <div class="flex-gap" style="margin-top:.75rem">
              <button class="btn btn-primary btn-sm" id="btn-save-mistake">Save</button>
              <button class="btn btn-ghost btn-sm" id="btn-cancel-mistake">Cancel</button>
            </div>
          </div>
        </div>

        <div id="mistakes-list">
          ${renderMistakes(data)}
        </div>
      </div>

      <!-- Tab 4: Statistics -->
      <div class="tab-pane" id="tab-prob-statistics">
        ${renderStatistics(data)}
      </div>
    </div>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/*  Sub-renderers                                                     */
/* ------------------------------------------------------------------ */

function renderProblemLog(data) {
  const log = [...(data.problemLog || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!log.length) {
    return `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">No problems logged yet. Start solving!</div></div>`;
  }

  return `
  <div class="card">
    <div class="card-body" style="padding:0">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid var(--border-primary)">
            <th style="padding:.75rem 1rem">Problem</th>
            <th style="padding:.75rem .5rem">Difficulty</th>
            <th style="padding:.75rem .5rem">Time</th>
            <th style="padding:.75rem .5rem">Result</th>
            <th style="padding:.75rem .5rem">Date</th>
            <th style="padding:.75rem .5rem"></th>
          </tr>
        </thead>
        <tbody>
          ${log.map(p => `
          <tr class="problem-log-entry" style="border-bottom:1px solid var(--border-secondary)">
            <td style="padding:.65rem 1rem;font-weight:500">${sanitizeHTML(p.title || 'Untitled')}</td>
            <td style="padding:.65rem .5rem">${difficultyTag(p.difficulty || 'medium')}</td>
            <td style="padding:.65rem .5rem">${p.timeMinutes || 0}m</td>
            <td style="padding:.65rem .5rem"><span style="${resultColor(p.result)};font-weight:600;text-transform:capitalize">${p.result || '—'}</span></td>
            <td style="padding:.65rem .5rem;opacity:.7">${p.date || '—'}</td>
            <td style="padding:.65rem .5rem">
              <button class="btn btn-ghost btn-sm btn-icon btn-delete-problem" data-id="${p.id}" title="Delete">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderPatterns(data) {
  const patterns = data.patterns || [];
  if (!patterns.length) {
    return `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">No patterns configured.</div></div>`;
  }
  return patterns.map(p => `
    <div class="card pattern-card" style="${p.mastered ? 'background:var(--color-success-bg);border-color:var(--color-success)' : ''}">
      <div class="card-body" style="display:flex;align-items:center;gap:.75rem">
        <label class="checkbox-wrapper">
          <input type="checkbox" class="pattern-checkbox" data-id="${p.id}" ${p.mastered ? 'checked' : ''} />
          <span class="checkbox-custom">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>
          </span>
        </label>
        <span class="checkbox-label" style="font-weight:500">${sanitizeHTML(p.name)}</span>
      </div>
    </div>`).join('');
}

function renderMistakes(data) {
  const mistakes = [...(data.mistakes || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!mistakes.length) {
    return `<div class="empty-state">
      <div class="empty-icon">🌱</div>
      <div class="empty-text">No mistakes logged — every mistake is a stepping stone to mastery!</div>
    </div>`;
  }

  const encouragements = [
    "Every mistake is a lesson in disguise 💡",
    "You're growing stronger by reflecting 💪",
    "Mistakes are proof you're trying ⭐",
    "This awareness will make you unstoppable 🚀",
    "Great learners review their stumbles 🎯"
  ];

  return mistakes.map((m, i) => `
    <div class="card" style="margin-bottom:.75rem">
      <div class="card-body">
        <div class="problem-log-header flex-between">
          <span style="font-weight:600">${sanitizeHTML(m.problem || 'Unknown')}</span>
          <div class="flex-gap">
            <span style="opacity:.6;font-size:.85rem">${m.date || '—'}</span>
            <button class="btn btn-ghost btn-sm btn-icon btn-delete-mistake" data-id="${m.id}" title="Delete">🗑️</button>
          </div>
        </div>
        <div style="margin-top:.5rem">
          <div style="margin-bottom:.35rem"><strong style="color:var(--color-danger)">What went wrong:</strong> ${sanitizeHTML(m.whatWentWrong || '')}</div>
          <div><strong style="color:var(--color-success)">Lesson learned:</strong> ${sanitizeHTML(m.lessonLearned || '')}</div>
        </div>
        <div style="margin-top:.5rem;font-size:.8rem;opacity:.7;font-style:italic">${encouragements[i % encouragements.length]}</div>
      </div>
    </div>`).join('');
}

function renderStatistics(data) {
  const log = data.problemLog || [];

  // Problems by difficulty
  const byCounts = { easy: 0, medium: 0, hard: 0 };
  log.forEach(p => { if (byCounts[p.difficulty] !== undefined) byCounts[p.difficulty]++; });
  const maxDiff = Math.max(byCounts.easy, byCounts.medium, byCounts.hard, 1);

  // Last 10 results
  const last10 = [...log].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10).reverse();

  // Most common mistake types (simple word frequency from whatWentWrong)
  const mistakeWords = {};
  (data.mistakes || []).forEach(m => {
    const words = (m.whatWentWrong || '').toLowerCase().split(/\s+/);
    words.forEach(w => {
      if (w.length > 4) mistakeWords[w] = (mistakeWords[w] || 0) + 1;
    });
  });
  const topMistakes = Object.entries(mistakeWords).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Time distribution
  const timeBuckets = { '0-15m': 0, '15-30m': 0, '30-60m': 0, '60m+': 0 };
  log.forEach(p => {
    const t = p.timeMinutes || 0;
    if (t <= 15) timeBuckets['0-15m']++;
    else if (t <= 30) timeBuckets['15-30m']++;
    else if (t <= 60) timeBuckets['30-60m']++;
    else timeBuckets['60m+']++;
  });
  const maxBucket = Math.max(...Object.values(timeBuckets), 1);

  return `
  <div class="analytics-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
    <!-- Difficulty breakdown -->
    <div class="card">
      <div class="card-header"><h3 class="card-title">Problems by Difficulty</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${['easy', 'medium', 'hard'].map(d => `
          <div class="bar-chart-item">
            <div class="bar-chart-label">${d}</div>
            <div class="bar-chart-bar">
              <div style="width:${(byCounts[d] / maxDiff) * 100}%;height:100%;background:var(${d === 'easy' ? '--color-success' : d === 'medium' ? '--color-warning' : '--color-danger'});border-radius:4px;transition:width .3s"></div>
            </div>
            <div class="bar-chart-value">${byCounts[d]}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Success trend -->
    <div class="card">
      <div class="card-header"><h3 class="card-title">Last 10 Results</h3></div>
      <div class="card-body">
        ${last10.length ? `
        <div style="display:flex;gap:.35rem;align-items:flex-end;height:100px">
          ${last10.map(p => {
            const h = p.result === 'solved' ? 100 : p.result === 'partial' ? 55 : 20;
            const col = p.result === 'solved' ? 'var(--color-success)' : p.result === 'partial' ? 'var(--color-warning)' : 'var(--color-danger)';
            return `<div style="flex:1;height:${h}%;background:${col};border-radius:4px 4px 0 0;min-width:0" title="${sanitizeHTML(p.title || '')} — ${p.result}"></div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:.35rem;margin-top:.25rem">
          ${last10.map(p => `<div style="flex:1;text-align:center;font-size:.6rem;opacity:.6;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${sanitizeHTML(p.title || '').slice(0, 6)}</div>`).join('')}
        </div>` : '<div class="empty-state"><div class="empty-text">No data yet</div></div>'}
      </div>
    </div>

    <!-- Common mistake types -->
    <div class="card">
      <div class="card-header"><h3 class="card-title">Common Mistake Keywords</h3></div>
      <div class="card-body">
        ${topMistakes.length ? topMistakes.map(([word, count]) => `
        <div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--border-secondary)">
          <span>${sanitizeHTML(word)}</span>
          <span class="badge">${count}</span>
        </div>`).join('') : '<div class="empty-state"><div class="empty-text">No mistakes logged yet</div></div>'}
      </div>
    </div>

    <!-- Time distribution -->
    <div class="card">
      <div class="card-header"><h3 class="card-title">Time Distribution</h3></div>
      <div class="card-body">
        <div class="bar-chart">
          ${Object.entries(timeBuckets).map(([label, count]) => `
          <div class="bar-chart-item">
            <div class="bar-chart-label">${label}</div>
            <div class="bar-chart-bar">
              <div style="width:${(count / maxBucket) * 100}%;height:100%;background:var(--accent-primary);border-radius:4px;transition:width .3s"></div>
            </div>
            <div class="bar-chart-value">${count}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/*  Init / Destroy                                                    */
/* ------------------------------------------------------------------ */

let _controller = null;

export function init() {
  _controller = new AbortController();
  const signal = _controller.signal;
  const root = document.getElementById('main-content');
  if (!root) return;

  root.addEventListener('click', handleClick, { signal });
  root.addEventListener('change', handleChange, { signal });
}

export function destroy() {
  if (_controller) {
    _controller.abort();
    _controller = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Event Handlers (delegated)                                        */
/* ------------------------------------------------------------------ */

function handleClick(e) {
  const target = e.target.closest('button') || e.target.closest('.tab');
  if (!target) return;

  /* Tabs */
  if (target.classList.contains('tab') && target.dataset.tab) {
    switchTab(target.dataset.tab);
    return;
  }

  /* Problem Log */
  if (target.id === 'btn-add-problem') {
    toggleForm('problem-form-card', true);
    return;
  }
  if (target.id === 'btn-cancel-problem') {
    toggleForm('problem-form-card', false);
    return;
  }
  if (target.id === 'btn-save-problem') {
    saveProblem();
    return;
  }
  if (target.classList.contains('btn-delete-problem')) {
    deleteProblem(target.dataset.id);
    return;
  }

  /* Mistakes */
  if (target.id === 'btn-add-mistake') {
    toggleForm('mistake-form-card', true);
    return;
  }
  if (target.id === 'btn-cancel-mistake') {
    toggleForm('mistake-form-card', false);
    return;
  }
  if (target.id === 'btn-save-mistake') {
    saveMistake();
    return;
  }
  if (target.classList.contains('btn-delete-mistake')) {
    deleteMistake(target.dataset.id);
    return;
  }
}

function handleChange(e) {
  /* Pattern checkbox */
  if (e.target.classList.contains('pattern-checkbox')) {
    togglePattern(e.target.dataset.id, e.target.checked);
  }
}

/* ------------------------------------------------------------------ */
/*  Actions                                                           */
/* ------------------------------------------------------------------ */

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
}

function toggleForm(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}

function saveProblem() {
  const title = document.getElementById('pf-title')?.value.trim();
  if (!title) { showToast('Please enter a problem title', 'warning'); return; }
  const difficulty = document.getElementById('pf-difficulty')?.value || 'medium';
  const timeMinutes = parseInt(document.getElementById('pf-time')?.value, 10) || 0;
  const result = document.getElementById('pf-result')?.value || 'solved';
  const approach = document.getElementById('pf-approach')?.value.trim() || '';

  const data = getData();
  data.problemLog = data.problemLog || [];
  data.problemLog.push({
    id: generateId(),
    title,
    difficulty,
    timeMinutes,
    result,
    approach,
    date: getToday()
  });
  saveData(data);

  // Log activity
  store.incrementActivity(getToday(), 'problemsSolved', 1);

  // Re-render relevant sections
  refreshProblemLog(data);
  refreshStats(data);
  toggleForm('problem-form-card', false);
  clearForm('pf-title', 'pf-time', 'pf-approach');
  showToast('Problem logged!', 'success');
}

function deleteProblem(id) {
  const data = getData();
  data.problemLog = (data.problemLog || []).filter(p => p.id !== id);
  saveData(data);
  refreshProblemLog(data);
  refreshStats(data);
  showToast('Problem removed', 'info');
}

function togglePattern(id, checked) {
  const data = getData();
  const pattern = (data.patterns || []).find(p => p.id === id);
  if (pattern) {
    pattern.mastered = checked;
    saveData(data);
    // Refresh patterns grid to update card backgrounds
    const grid = document.getElementById('patterns-grid');
    if (grid) grid.innerHTML = renderPatterns(data);
    refreshStats(data);
  }
}

function saveMistake() {
  const problem = document.getElementById('mf-problem')?.value.trim();
  if (!problem) { showToast('Please enter a problem name', 'warning'); return; }
  const date = document.getElementById('mf-date')?.value || getToday();
  const whatWentWrong = document.getElementById('mf-wrong')?.value.trim() || '';
  const lessonLearned = document.getElementById('mf-lesson')?.value.trim() || '';

  const data = getData();
  data.mistakes = data.mistakes || [];
  data.mistakes.push({
    id: generateId(),
    problem,
    whatWentWrong,
    lessonLearned,
    date
  });
  saveData(data);

  refreshMistakes(data);
  toggleForm('mistake-form-card', false);
  clearForm('mf-problem', 'mf-wrong', 'mf-lesson');
  showToast('Mistake logged — you\'re growing! 🌱', 'success');
}

function deleteMistake(id) {
  const data = getData();
  data.mistakes = (data.mistakes || []).filter(m => m.id !== id);
  saveData(data);
  refreshMistakes(data);
  showToast('Entry removed', 'info');
}

/* ------------------------------------------------------------------ */
/*  Refresh helpers                                                   */
/* ------------------------------------------------------------------ */

function refreshProblemLog(data) {
  const el = document.getElementById('problem-list');
  if (el) el.innerHTML = renderProblemLog(data);
}

function refreshMistakes(data) {
  const el = document.getElementById('mistakes-list');
  if (el) el.innerHTML = renderMistakes(data);
}

function refreshStats(data) {
  const stats = computeStats(data);
  const cards = document.querySelectorAll('.stat-card');
  if (cards.length >= 4) {
    cards[0].querySelector('.stat-value').textContent = stats.totalSolved;
    cards[1].querySelector('.stat-value').textContent = stats.successRate + '%';
    cards[2].querySelector('.stat-value').textContent = stats.avgTime + 'm';
    cards[3].querySelector('.stat-value').textContent = stats.patternsMastered;
  }
  // Also refresh statistics tab content
  const statsTab = document.getElementById('tab-prob-statistics');
  if (statsTab) statsTab.innerHTML = renderStatistics(data);
}

function clearForm(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}
