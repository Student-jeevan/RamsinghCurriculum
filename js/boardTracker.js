/**
 * boardTracker.js
 * Board exam preparation tracker with syllabus, previous papers,
 * important questions, mock tests, and a readiness gauge.
 * ES Module — exports render(), init(), destroy()
 */

import { store } from './store.js';
import { generateId, getToday, sanitizeHTML, showToast } from './utils.js';
import { getDefaultBoardExtra } from './data.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getData() {
  return store.get('board_extra') || getDefaultBoardExtra();
}

function saveData(data) {
  store.set('board_extra', data);
}

/** Compute aggregate stats. */
function computeStats(data) {
  const subjects = data.subjects || [];
  let totalChapters = 0;
  let completedChapters = 0;
  subjects.forEach(s => {
    (s.chapters || []).forEach(c => {
      totalChapters++;
      if (c.completed) completedChapters++;
    });
  });
  const syllabusProgress = totalChapters ? Math.round((completedChapters / totalChapters) * 100) : 0;

  const papers = data.previousYearPapers || [];
  const papersDone = papers.filter(p => p.completed).length;

  const mocks = data.mockTests || [];
  const mockCount = mocks.length;
  const mockAvg = mocks.length
    ? Math.round(mocks.reduce((s, m) => s + ((m.score / (m.maxScore || 100)) * 100), 0) / mocks.length)
    : 0;

  // Readiness: 50% syllabus + 30% mock avg + 20% papers ratio
  const papersRatio = papers.length ? (papersDone / papers.length) * 100 : 0;
  const readiness = Math.round(syllabusProgress * 0.5 + mockAvg * 0.3 + papersRatio * 0.2);

  return { syllabusProgress, papersDone, mockCount, mockAvg, readiness };
}

function readinessLabel(r) {
  if (r < 40) return 'Not Ready';
  if (r < 60) return 'Getting There';
  if (r < 80) return 'Ready';
  return 'Well Prepared';
}

function readinessColor(r) {
  if (r < 40) return 'var(--color-danger)';
  if (r < 70) return 'var(--color-warning)';
  return 'var(--color-success)';
}

/** SVG circular gauge. */
function readinessGauge(pct) {
  const color = readinessColor(pct);
  const label = readinessLabel(pct);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return `
  <div style="text-align:center">
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--border-primary)" stroke-width="10"/>
      <circle cx="70" cy="70" r="${radius}" fill="none" stroke="${color}" stroke-width="10"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 70 70)" style="transition:stroke-dashoffset .6s ease"/>
      <text x="70" y="66" text-anchor="middle" font-size="26" font-weight="700" fill="${color}">${pct}%</text>
      <text x="70" y="86" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${label}</text>
    </svg>
  </div>`;
}

function scoreColor(pct) {
  if (pct >= 80) return 'var(--color-success)';
  if (pct >= 60) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function frequencyBadge(freq) {
  const colors = { high: 'var(--color-danger)', medium: 'var(--color-warning)', low: 'var(--accent-primary)' };
  return `<span class="badge" style="background:${colors[freq] || colors.low};color:#fff">${freq}</span>`;
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
    <h1 class="page-title">🎓 Board Exam Tracker</h1>
  </div>

  <div class="page-content">
    <!-- Readiness Gauge + Stats -->
    <div class="grid grid-4" style="margin-bottom:1.5rem">
      <div class="stat-card" style="grid-row:span 2;display:flex;align-items:center;justify-content:center">
        ${readinessGauge(stats.readiness)}
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.syllabusProgress}%</div>
        <div class="stat-label">Syllabus Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.papersDone}</div>
        <div class="stat-label">Papers Solved</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.mockCount}</div>
        <div class="stat-label">Mock Tests</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab active" data-tab="board-syllabus">Syllabus</button>
      <button class="tab" data-tab="board-papers">Previous Papers</button>
      <button class="tab" data-tab="board-questions">Important Questions</button>
      <button class="tab" data-tab="board-mocks">Mock Tests</button>
    </div>

    <div class="tab-content">
      <!-- Tab 1: Syllabus -->
      <div class="tab-pane active" id="tab-board-syllabus">
        <div id="syllabus-list">${renderSyllabus(data)}</div>
      </div>

      <!-- Tab 2: Previous Papers -->
      <div class="tab-pane" id="tab-board-papers">
        <div class="flex-between" style="margin-bottom:1rem">
          <span style="font-weight:600">Previous Year Papers</span>
          <button class="btn btn-primary btn-sm" id="btn-add-paper">+ Add Paper</button>
        </div>
        <div class="card" id="paper-form-card" style="display:none;margin-bottom:1rem">
          <div class="card-body">
            <div class="grid grid-3" style="gap:.75rem">
              <div class="form-group">
                <label class="form-label">Year</label>
                <input class="input" id="ppf-year" type="number" placeholder="2025" />
              </div>
              <div class="form-group">
                <label class="form-label">Subject</label>
                <input class="input" id="ppf-subject" placeholder="Mathematics" />
              </div>
              <div class="form-group">
                <label class="form-label">Score (%)</label>
                <input class="input" id="ppf-score" type="number" min="0" max="100" placeholder="85" />
              </div>
            </div>
            <div class="flex-gap" style="margin-top:.75rem">
              <button class="btn btn-primary btn-sm" id="btn-save-paper">Save</button>
              <button class="btn btn-ghost btn-sm" id="btn-cancel-paper">Cancel</button>
            </div>
          </div>
        </div>
        <div id="papers-list">${renderPapers(data)}</div>
      </div>

      <!-- Tab 3: Important Questions -->
      <div class="tab-pane" id="tab-board-questions">
        <div class="flex-between" style="margin-bottom:1rem">
          <span style="font-weight:600">Important Questions</span>
          <button class="btn btn-primary btn-sm" id="btn-add-question">+ Add Question</button>
        </div>
        <div class="card" id="question-form-card" style="display:none;margin-bottom:1rem">
          <div class="card-body">
            <div class="grid grid-2" style="gap:.75rem">
              <div class="form-group">
                <label class="form-label">Subject</label>
                <input class="input" id="iqf-subject" placeholder="Physics" />
              </div>
              <div class="form-group">
                <label class="form-label">Frequency</label>
                <select class="select" id="iqf-frequency">
                  <option value="high">High</option>
                  <option value="medium" selected>Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-top:.75rem">
              <label class="form-label">Question</label>
              <textarea class="textarea" id="iqf-question" rows="2" placeholder="Enter the question…"></textarea>
            </div>
            <div class="flex-gap" style="margin-top:.75rem">
              <button class="btn btn-primary btn-sm" id="btn-save-question">Save</button>
              <button class="btn btn-ghost btn-sm" id="btn-cancel-question">Cancel</button>
            </div>
          </div>
        </div>
        <!-- Filters -->
        <div class="flex-gap" style="margin-bottom:1rem">
          <select class="select" id="iq-filter-subject" style="max-width:200px">
            <option value="">All Subjects</option>
          </select>
          <select class="select" id="iq-filter-freq" style="max-width:150px">
            <option value="">All Frequencies</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div id="questions-list">${renderQuestions(data)}</div>
      </div>

      <!-- Tab 4: Mock Tests -->
      <div class="tab-pane" id="tab-board-mocks">
        <div class="flex-between" style="margin-bottom:1rem">
          <span style="font-weight:600">Mock Tests</span>
          <button class="btn btn-primary btn-sm" id="btn-add-mock">+ Add Mock Test</button>
        </div>
        <div class="card" id="mock-form-card" style="display:none;margin-bottom:1rem">
          <div class="card-body">
            <div class="grid grid-3" style="gap:.75rem">
              <div class="form-group">
                <label class="form-label">Date</label>
                <input class="input" id="mtf-date" type="date" value="${getToday()}" />
              </div>
              <div class="form-group">
                <label class="form-label">Subject</label>
                <input class="input" id="mtf-subject" placeholder="Chemistry" />
              </div>
              <div class="form-group">
                <label class="form-label">Score</label>
                <input class="input" id="mtf-score" type="number" min="0" placeholder="72" />
              </div>
              <div class="form-group">
                <label class="form-label">Max Score</label>
                <input class="input" id="mtf-max" type="number" min="1" placeholder="100" />
              </div>
              <div class="form-group">
                <label class="form-label">Time (min)</label>
                <input class="input" id="mtf-time" type="number" min="0" placeholder="180" />
              </div>
            </div>
            <div class="form-group" style="margin-top:.75rem">
              <label class="form-label">Notes</label>
              <textarea class="textarea" id="mtf-notes" rows="2" placeholder="Observations…"></textarea>
            </div>
            <div class="flex-gap" style="margin-top:.75rem">
              <button class="btn btn-primary btn-sm" id="btn-save-mock">Save</button>
              <button class="btn btn-ghost btn-sm" id="btn-cancel-mock">Cancel</button>
            </div>
          </div>
        </div>
        <div id="mocks-list">${renderMocks(data)}</div>
      </div>
    </div>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/*  Sub-renderers                                                     */
/* ------------------------------------------------------------------ */

function renderSyllabus(data) {
  const subjects = data.subjects || [];
  if (!subjects.length) {
    return `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-text">No subjects configured.</div></div>`;
  }

  return subjects.map(sub => {
    const chapters = sub.chapters || [];
    const done = chapters.filter(c => c.completed).length;
    const pct = chapters.length ? Math.round((done / chapters.length) * 100) : 0;

    return `
    <div class="card" style="margin-bottom:1rem">
      <div class="card-header flex-between">
        <h3 class="card-title">${sanitizeHTML(sub.name)}</h3>
        <span class="badge" style="${pct === 100 ? 'background:var(--color-success);color:#fff' : ''}">${pct}%</span>
      </div>
      <div class="card-body">
        <div class="progress-bar" style="margin-bottom:.75rem">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="checklist">
          ${chapters.map(ch => `
          <div class="checklist-item">
            <label class="checkbox-wrapper">
              <input type="checkbox" class="chapter-checkbox" data-subject="${sub.id}" data-chapter="${ch.id}" ${ch.completed ? 'checked' : ''} />
              <span class="checkbox-custom">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>
              </span>
              <span class="checkbox-label" style="${ch.completed ? 'text-decoration:line-through;opacity:.6' : ''}">${sanitizeHTML(ch.name)}</span>
            </label>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderPapers(data) {
  const papers = [...(data.previousYearPapers || [])].sort((a, b) => (b.year || 0) - (a.year || 0));
  if (!papers.length) {
    return `<div class="empty-state"><div class="empty-icon">📄</div><div class="empty-text">No papers added yet.</div></div>`;
  }

  return `
  <div class="card">
    <div class="card-body" style="padding:0">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid var(--border-primary)">
            <th style="padding:.75rem 1rem">Year</th>
            <th style="padding:.75rem .5rem">Subject</th>
            <th style="padding:.75rem .5rem">Status</th>
            <th style="padding:.75rem .5rem">Score</th>
            <th style="padding:.75rem .5rem"></th>
          </tr>
        </thead>
        <tbody>
          ${papers.map(p => `
          <tr style="border-bottom:1px solid var(--border-secondary)">
            <td style="padding:.65rem 1rem;font-weight:500">${p.year || '—'}</td>
            <td style="padding:.65rem .5rem">${sanitizeHTML(p.subject || '')}</td>
            <td style="padding:.65rem .5rem">
              <label class="checkbox-wrapper">
                <input type="checkbox" class="paper-checkbox" data-id="${p.id}" ${p.completed ? 'checked' : ''} />
                <span class="checkbox-custom">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>
                </span>
                <span class="checkbox-label">${p.completed ? 'Done' : 'Pending'}</span>
              </label>
            </td>
            <td style="padding:.65rem .5rem">${p.score != null ? `<span class="score-badge" style="color:${scoreColor(p.score)};font-weight:600">${p.score}%</span>` : '—'}</td>
            <td style="padding:.65rem .5rem">
              <button class="btn btn-ghost btn-sm btn-icon btn-delete-paper" data-id="${p.id}" title="Delete">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderQuestions(data, filterSubject = '', filterFreq = '') {
  let questions = [...(data.importantQuestions || [])];

  if (filterSubject) {
    questions = questions.filter(q => q.subject === filterSubject);
  }
  if (filterFreq) {
    questions = questions.filter(q => q.frequency === filterFreq);
  }

  if (!questions.length) {
    return `<div class="empty-state"><div class="empty-icon">❓</div><div class="empty-text">No important questions${filterSubject || filterFreq ? ' match the current filters' : ' added yet'}.</div></div>`;
  }

  return questions.map(q => `
    <div class="list-item" style="margin-bottom:.5rem">
      <div style="display:flex;align-items:flex-start;gap:.75rem;width:100%">
        <label class="checkbox-wrapper" style="margin-top:2px">
          <input type="checkbox" class="question-answered" data-id="${q.id}" ${q.answered ? 'checked' : ''} />
          <span class="checkbox-custom">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>
          </span>
        </label>
        <div class="list-item-content" style="flex:1">
          <div class="list-item-title" style="${q.answered ? 'text-decoration:line-through;opacity:.6' : ''}">${sanitizeHTML(q.question || '')}</div>
          <div class="list-item-meta" style="margin-top:.25rem">
            <span class="badge">${sanitizeHTML(q.subject || '')}</span>
            ${frequencyBadge(q.frequency || 'low')}
          </div>
        </div>
        <button class="btn btn-ghost btn-sm btn-icon btn-delete-question" data-id="${q.id}" title="Delete">🗑️</button>
      </div>
    </div>`).join('');
}

function renderMocks(data) {
  const mocks = [...(data.mockTests || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Average score summary
  const avgScore = mocks.length
    ? Math.round(mocks.reduce((s, m) => s + ((m.score / (m.maxScore || 100)) * 100), 0) / mocks.length)
    : 0;

  const summary = mocks.length ? `
    <div class="stat-card" style="margin-bottom:1rem">
      <div class="stat-value" style="color:${scoreColor(avgScore)}">${avgScore}%</div>
      <div class="stat-label">Average Mock Score (${mocks.length} test${mocks.length > 1 ? 's' : ''})</div>
    </div>` : '';

  if (!mocks.length) {
    return `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">No mock tests recorded yet.</div></div>`;
  }

  return `
  ${summary}
  <div class="grid grid-2">
    ${mocks.map(m => {
      const pct = m.maxScore ? Math.round((m.score / m.maxScore) * 100) : 0;
      return `
      <div class="card mock-test-entry">
        <div class="card-body">
          <div class="flex-between" style="margin-bottom:.5rem">
            <span style="font-weight:600">${sanitizeHTML(m.subject || 'General')}</span>
            <span class="score-badge" style="font-size:1.25rem;font-weight:700;color:${scoreColor(pct)}">${pct}%</span>
          </div>
          <div style="font-size:.85rem;opacity:.7;margin-bottom:.5rem">${m.date || '—'} · ${m.timeMinutes || 0} min</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;background:${scoreColor(pct)}"></div>
          </div>
          <div style="font-size:.85rem;margin-top:.5rem">${m.score}/${m.maxScore}</div>
          ${m.notes ? `<div style="margin-top:.5rem;font-size:.85rem;opacity:.8;font-style:italic">${sanitizeHTML(m.notes)}</div>` : ''}
          <div style="text-align:right;margin-top:.5rem">
            <button class="btn btn-ghost btn-sm btn-icon btn-delete-mock" data-id="${m.id}" title="Delete">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('')}
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

  // Populate subject filter dropdown
  populateSubjectFilter();
}

export function destroy() {
  if (_controller) {
    _controller.abort();
    _controller = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Event Handlers                                                    */
/* ------------------------------------------------------------------ */

function handleClick(e) {
  const target = e.target.closest('button') || e.target.closest('.tab');
  if (!target) return;

  /* Tabs */
  if (target.classList.contains('tab') && target.dataset.tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target.dataset.tab));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${target.dataset.tab}`));
    return;
  }

  /* Papers */
  if (target.id === 'btn-add-paper') { toggleForm('paper-form-card', true); return; }
  if (target.id === 'btn-cancel-paper') { toggleForm('paper-form-card', false); return; }
  if (target.id === 'btn-save-paper') { savePaper(); return; }
  if (target.classList.contains('btn-delete-paper')) { deletePaper(target.dataset.id); return; }

  /* Important Questions */
  if (target.id === 'btn-add-question') { toggleForm('question-form-card', true); return; }
  if (target.id === 'btn-cancel-question') { toggleForm('question-form-card', false); return; }
  if (target.id === 'btn-save-question') { saveQuestion(); return; }
  if (target.classList.contains('btn-delete-question')) { deleteQuestion(target.dataset.id); return; }

  /* Mock Tests */
  if (target.id === 'btn-add-mock') { toggleForm('mock-form-card', true); return; }
  if (target.id === 'btn-cancel-mock') { toggleForm('mock-form-card', false); return; }
  if (target.id === 'btn-save-mock') { saveMock(); return; }
  if (target.classList.contains('btn-delete-mock')) { deleteMock(target.dataset.id); return; }
}

function handleChange(e) {
  /* Chapter checkbox */
  if (e.target.classList.contains('chapter-checkbox')) {
    toggleChapter(e.target.dataset.subject, e.target.dataset.chapter, e.target.checked);
    return;
  }
  /* Paper checkbox */
  if (e.target.classList.contains('paper-checkbox')) {
    togglePaperCompleted(e.target.dataset.id, e.target.checked);
    return;
  }
  /* Important question answered */
  if (e.target.classList.contains('question-answered')) {
    toggleQuestionAnswered(e.target.dataset.id, e.target.checked);
    return;
  }
  /* Filters */
  if (e.target.id === 'iq-filter-subject' || e.target.id === 'iq-filter-freq') {
    applyQuestionFilters();
    return;
  }
}

/* ------------------------------------------------------------------ */
/*  Actions                                                           */
/* ------------------------------------------------------------------ */

function toggleForm(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}

function toggleChapter(subjectId, chapterId, checked) {
  const data = getData();
  const subject = (data.subjects || []).find(s => s.id === subjectId);
  if (!subject) return;
  const chapter = (subject.chapters || []).find(c => c.id === chapterId);
  if (!chapter) return;
  chapter.completed = checked;
  saveData(data);

  // Log activity when completing a chapter
  if (checked) {
    store.incrementActivity(getToday(), 'topicsCompleted', 1);
  }

  // Refresh syllabus & stats
  const el = document.getElementById('syllabus-list');
  if (el) el.innerHTML = renderSyllabus(data);
  refreshTopStats(data);
}

function togglePaperCompleted(id, checked) {
  const data = getData();
  const paper = (data.previousYearPapers || []).find(p => p.id === id);
  if (paper) {
    paper.completed = checked;
    saveData(data);
    refreshTopStats(data);
  }
}

function toggleQuestionAnswered(id, checked) {
  const data = getData();
  const q = (data.importantQuestions || []).find(q => q.id === id);
  if (q) {
    q.answered = checked;
    saveData(data);
    applyQuestionFilters();
  }
}

function savePaper() {
  const year = parseInt(document.getElementById('ppf-year')?.value, 10);
  const subject = document.getElementById('ppf-subject')?.value.trim();
  if (!year || !subject) { showToast('Please fill year and subject', 'warning'); return; }
  const score = parseInt(document.getElementById('ppf-score')?.value, 10) || null;

  const data = getData();
  data.previousYearPapers = data.previousYearPapers || [];
  data.previousYearPapers.push({
    id: generateId(),
    year,
    subject,
    completed: score != null,
    score
  });
  saveData(data);

  const el = document.getElementById('papers-list');
  if (el) el.innerHTML = renderPapers(data);
  toggleForm('paper-form-card', false);
  refreshTopStats(data);
  showToast('Paper added!', 'success');
}

function deletePaper(id) {
  const data = getData();
  data.previousYearPapers = (data.previousYearPapers || []).filter(p => p.id !== id);
  saveData(data);
  const el = document.getElementById('papers-list');
  if (el) el.innerHTML = renderPapers(data);
  refreshTopStats(data);
  showToast('Paper removed', 'info');
}

function saveQuestion() {
  const subject = document.getElementById('iqf-subject')?.value.trim();
  const question = document.getElementById('iqf-question')?.value.trim();
  if (!question) { showToast('Please enter the question', 'warning'); return; }
  const frequency = document.getElementById('iqf-frequency')?.value || 'medium';

  const data = getData();
  data.importantQuestions = data.importantQuestions || [];
  data.importantQuestions.push({
    id: generateId(),
    subject: subject || 'General',
    question,
    frequency,
    answered: false
  });
  saveData(data);

  applyQuestionFilters();
  populateSubjectFilter();
  toggleForm('question-form-card', false);
  showToast('Question added!', 'success');
}

function deleteQuestion(id) {
  const data = getData();
  data.importantQuestions = (data.importantQuestions || []).filter(q => q.id !== id);
  saveData(data);
  applyQuestionFilters();
  showToast('Question removed', 'info');
}

function saveMock() {
  const subject = document.getElementById('mtf-subject')?.value.trim();
  const score = parseInt(document.getElementById('mtf-score')?.value, 10);
  const maxScore = parseInt(document.getElementById('mtf-max')?.value, 10) || 100;
  if (!subject || isNaN(score)) { showToast('Please fill subject and score', 'warning'); return; }
  const date = document.getElementById('mtf-date')?.value || getToday();
  const timeMinutes = parseInt(document.getElementById('mtf-time')?.value, 10) || 0;
  const notes = document.getElementById('mtf-notes')?.value.trim() || '';

  const data = getData();
  data.mockTests = data.mockTests || [];
  data.mockTests.push({
    id: generateId(),
    date,
    subject,
    score,
    maxScore,
    timeMinutes,
    notes
  });
  saveData(data);

  const el = document.getElementById('mocks-list');
  if (el) el.innerHTML = renderMocks(data);
  toggleForm('mock-form-card', false);
  refreshTopStats(data);
  showToast('Mock test recorded!', 'success');
}

function deleteMock(id) {
  const data = getData();
  data.mockTests = (data.mockTests || []).filter(m => m.id !== id);
  saveData(data);
  const el = document.getElementById('mocks-list');
  if (el) el.innerHTML = renderMocks(data);
  refreshTopStats(data);
  showToast('Mock test removed', 'info');
}

function applyQuestionFilters() {
  const data = getData();
  const subjectFilter = document.getElementById('iq-filter-subject')?.value || '';
  const freqFilter = document.getElementById('iq-filter-freq')?.value || '';
  const el = document.getElementById('questions-list');
  if (el) el.innerHTML = renderQuestions(data, subjectFilter, freqFilter);
}

function populateSubjectFilter() {
  const data = getData();
  const select = document.getElementById('iq-filter-subject');
  if (!select) return;
  const subjects = [...new Set((data.importantQuestions || []).map(q => q.subject).filter(Boolean))];
  const current = select.value;
  select.innerHTML = `<option value="">All Subjects</option>` +
    subjects.map(s => `<option value="${sanitizeHTML(s)}" ${s === current ? 'selected' : ''}>${sanitizeHTML(s)}</option>`).join('');
}

function refreshTopStats(data) {
  const stats = computeStats(data);
  // Re-render the full top section is safest since it includes the gauge
  // But we can do targeted updates to the stat cards
  const cards = document.querySelectorAll('.stat-card');
  // cards[0] is the gauge card — re-render it
  if (cards[0]) cards[0].innerHTML = readinessGauge(stats.readiness);
  if (cards[1]) { cards[1].querySelector('.stat-value').textContent = stats.syllabusProgress + '%'; }
  if (cards[2]) { cards[2].querySelector('.stat-value').textContent = stats.papersDone; }
  if (cards[3]) { cards[3].querySelector('.stat-value').textContent = stats.mockCount; }
}
