/**
 * topicDetail.js — Slide-In Topic Detail Panel
 *
 * Listens for 'openTopicDetail' custom event and renders a slide-in
 * panel on the right side with full topic information, editable fields,
 * and a confetti celebration when marking as mastered.
 */

import { store } from './store.js';
import { sanitizeHTML, showToast, getToday, debounce, generateId } from './utils.js';
import { getDefaultCurriculum } from './data.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** DOM references for the panel and overlay */
let panelEl = null;
let overlayEl = null;

/** Currently displayed topic context */
let currentTopicId = null;
let currentTrackId = null;
let currentModuleId = null;

/* ------------------------------------------------------------------ */
/*  Private helpers                                                    */
/* ------------------------------------------------------------------ */

/** Get curriculum data */
function getCurriculum() {
  return store.get('curriculum') || getDefaultCurriculum();
}

/** Save curriculum */
function saveCurriculum(curriculum) {
  store.set('curriculum', curriculum);
}

/** Find a topic within the curriculum by its IDs */
function findTopic(curriculum, trackId, moduleId, topicId) {
  const track = curriculum.tracks.find(t => t.id === trackId);
  if (!track) return null;
  const mod = track.modules.find(m => m.id === moduleId);
  if (!mod) return null;
  return mod.topics.find(t => t.id === topicId) || null;
}

/** Status label map */
function statusLabel(status) {
  return {
    'not-started': 'Not Started',
    'learning': 'Learning',
    'revision': 'Revision',
    'mastered': 'Mastered'
  }[status] || status;
}

/** Render star rating HTML */
function renderStars(confidence) {
  let html = '<div class="rating">';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="rating-star ${i <= confidence ? 'active' : ''}" data-action="set-confidence" data-value="${i}">★</span>`;
  }
  html += '</div>';
  return html;
}

/** Render resources list */
function renderResources(resources) {
  if (!resources || resources.length === 0) {
    return '<p class="text-muted text-small">No resources added yet.</p>';
  }
  return resources.map((url, i) => `
    <div class="list-item" data-resource-index="${i}">
      <div class="list-item-content">
        <a href="${sanitizeHTML(url)}" target="_blank" rel="noopener" class="list-item-title text-small" style="word-break:break-all">${sanitizeHTML(url)}</a>
      </div>
      <button class="btn btn-ghost btn-sm btn-icon" data-action="remove-resource" data-resource-index="${i}" title="Remove">✕</button>
    </div>`).join('');
}

/** Render revision history */
function renderRevisionHistory(history) {
  if (!history || history.length === 0) {
    return '<p class="text-muted text-small">No revision entries yet.</p>';
  }
  return history.map((entry, i) => `
    <div class="list-item">
      <div class="list-item-content">
        <span class="list-item-title">${sanitizeHTML(entry.date)}</span>
        <span class="list-item-meta">${sanitizeHTML(entry.notes || '—')}</span>
      </div>
    </div>`).join('');
}

/** Build the inner HTML of the panel for the given topic */
function buildPanelContent(topic) {
  const statuses = ['not-started', 'learning', 'revision', 'mastered'];

  return `
    <!-- Header -->
    <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between">
      <h2 style="margin:0;font-size:1.25rem">${sanitizeHTML(topic.title)}</h2>
      <button class="btn btn-ghost btn-icon" data-action="close-panel" title="Close">✕</button>
    </div>

    <div class="modal-body" style="overflow-y:auto;flex:1;padding:1.25rem">

      <!-- Status Selector -->
      <div class="form-group">
        <label class="form-label">Status</label>
        <div class="flex flex-gap flex-wrap">
          ${statuses.map(s => `
            <button class="btn btn-sm ${topic.status === s ? 'btn-primary' : 'btn-secondary'}"
                    data-action="set-status" data-status="${s}">
              ${statusLabel(s)}
            </button>`).join('')}
        </div>
      </div>

      <!-- Description -->
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="textarea" id="td-description" data-action="update-description"
                  rows="3" placeholder="Add a description…">${sanitizeHTML(topic.description || '')}</textarea>
      </div>

      <!-- Confidence -->
      <div class="form-group">
        <label class="form-label">Confidence</label>
        ${renderStars(topic.confidence || 0)}
      </div>

      <!-- Practice Count -->
      <div class="form-group">
        <label class="form-label">Practice Count</label>
        <div class="counter">
          <button class="counter-btn" data-action="practice-dec">−</button>
          <span class="counter-value" id="td-practice-count">${topic.practiceCount || 0}</span>
          <button class="counter-btn" data-action="practice-inc">+</button>
        </div>
      </div>

      <!-- Dates -->
      <div class="form-group">
        <label class="form-label">Dates</label>
        <div class="flex flex-gap">
          <div>
            <span class="text-muted text-small">Started</span>
            <div>${topic.dateStarted || '—'}</div>
          </div>
          <div>
            <span class="text-muted text-small">Completed</span>
            <div>${topic.dateCompleted || '—'}</div>
          </div>
        </div>
      </div>

      <!-- Personal Notes -->
      <div class="form-group">
        <label class="form-label">Personal Notes</label>
        <textarea class="textarea" id="td-notes" data-action="update-notes"
                  rows="5" placeholder="Write your notes here…">${sanitizeHTML(topic.notes || '')}</textarea>
      </div>

      <!-- Resources -->
      <div class="form-group">
        <label class="form-label">Resources</label>
        <div id="td-resources-list">
          ${renderResources(topic.resources)}
        </div>
        <div class="flex flex-gap" style="margin-top:0.5rem">
          <input type="text" class="input" id="td-resource-input" placeholder="https://…" style="flex:1" />
          <button class="btn btn-secondary btn-sm" data-action="add-resource">Add</button>
        </div>
      </div>

      <!-- Revision History -->
      <div class="form-group">
        <label class="form-label">Revision History</label>
        <div id="td-revision-list">
          ${renderRevisionHistory(topic.revisionHistory)}
        </div>
        <div id="td-revision-form" style="display:none;margin-top:0.5rem">
          <textarea class="textarea" id="td-revision-notes" rows="2" placeholder="Revision notes…"></textarea>
          <div class="flex flex-gap" style="margin-top:0.5rem">
            <button class="btn btn-primary btn-sm" data-action="save-revision">Save</button>
            <button class="btn btn-ghost btn-sm" data-action="cancel-revision">Cancel</button>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" data-action="show-revision-form" id="td-add-revision-btn" style="margin-top:0.5rem">
          + Add Revision
        </button>
      </div>

    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <button class="btn btn-primary" data-action="mark-mastered" style="width:100%">
        🏆 Mark as Mastered
      </button>
    </div>`;
}

/** Show the panel */
function openPanel() {
  if (overlayEl) overlayEl.classList.add('active');
  if (panelEl) panelEl.classList.add('active');
}

/** Hide the panel */
function closePanel() {
  if (overlayEl) overlayEl.classList.remove('active');
  if (panelEl) panelEl.classList.remove('active');
  currentTopicId = null;
  currentTrackId = null;
  currentModuleId = null;
}

/** Helper: get current topic object (fresh from store) */
function getCurrentTopic() {
  const curriculum = getCurriculum();
  return findTopic(curriculum, currentTrackId, currentModuleId, currentTopicId);
}

/** Update topic field in store */
function updateTopicField(field, value) {
  const curriculum = getCurriculum();
  const topic = findTopic(curriculum, currentTrackId, currentModuleId, currentTopicId);
  if (!topic) return;
  topic[field] = value;
  saveCurriculum(curriculum);
}

/** Full re-render of the panel body */
function refreshPanel() {
  if (!panelEl || !currentTopicId) return;
  const topic = getCurrentTopic();
  if (!topic) return;
  panelEl.innerHTML = buildPanelContent(topic);
}

/** Notify other views that curriculum data changed */
function notifyCurriculumUpdate() {
  document.dispatchEvent(new CustomEvent('curriculumUpdated'));
}

/* ---------- Confetti Effect ---------- */

function launchConfetti() {
  const colors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#e84393', '#55efc4', '#fab1a0'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000;overflow:hidden';
  document.body.appendChild(container);

  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 300;
    const size = 6 + Math.random() * 8;
    const rotation = Math.random() * 360;
    const duration = 1000 + Math.random() * 1500;

    piece.style.cssText = `
      position:absolute;
      left:${left}%;
      top:-20px;
      width:${size}px;
      height:${size * 0.6}px;
      background:${color};
      border-radius:2px;
      transform:rotate(${rotation}deg);
      animation:confetti-fall ${duration}ms ease-in ${delay}ms forwards;
    `;
    container.appendChild(piece);
  }

  // Inject keyframes if not present
  if (!document.getElementById('confetti-keyframes')) {
    const style = document.createElement('style');
    style.id = 'confetti-keyframes';
    style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Clean up after animation
  setTimeout(() => {
    if (container.parentNode) container.parentNode.removeChild(container);
  }, 3000);
}

/* ------------------------------------------------------------------ */
/*  Event handlers                                                     */
/* ------------------------------------------------------------------ */

let _onOpenTopic = null;
let _onPanelClick = null;
let _onOverlayClick = null;
let _onKeydown = null;
let _onDescInput = null;
let _onNotesInput = null;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Panel is appended to body; render returns empty string */
export function render() {
  return '';
}

/** Initialise: create DOM elements and bind listeners */
export function init() {
  // Create overlay
  overlayEl = document.createElement('div');
  overlayEl.className = 'panel-overlay';
  document.body.appendChild(overlayEl);

  // Create slide panel
  panelEl = document.createElement('div');
  panelEl.className = 'slide-panel';
  panelEl.id = 'topic-detail-panel';
  document.body.appendChild(panelEl);

  /* ---------- Open event ---------- */
  _onOpenTopic = (e) => {
    const { topicId, trackId, moduleId } = e.detail;
    currentTopicId = topicId;
    currentTrackId = trackId;
    currentModuleId = moduleId;

    const topic = getCurrentTopic();
    if (!topic) {
      showToast('Topic not found', 'error');
      return;
    }

    panelEl.innerHTML = buildPanelContent(topic);
    openPanel();
    bindPanelInputListeners();
  };
  document.addEventListener('openTopicDetail', _onOpenTopic);

  /* ---------- Overlay click to close ---------- */
  _onOverlayClick = () => closePanel();
  overlayEl.addEventListener('click', _onOverlayClick);

  /* ---------- Escape key to close ---------- */
  _onKeydown = (e) => {
    if (e.key === 'Escape' && panelEl && panelEl.classList.contains('active')) {
      closePanel();
    }
  };
  document.addEventListener('keydown', _onKeydown);

  /* ---------- Delegated click inside panel ---------- */
  _onPanelClick = (e) => {
    const target = e.target;
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    /* Close panel */
    if (action === 'close-panel') {
      closePanel();
      return;
    }

    /* Set status */
    if (action === 'set-status') {
      const newStatus = actionEl.dataset.status;
      const curriculum = getCurriculum();
      const topic = findTopic(curriculum, currentTrackId, currentModuleId, currentTopicId);
      if (!topic) return;

      const oldStatus = topic.status;
      topic.status = newStatus;

      // Auto-set dateStarted
      if (oldStatus === 'not-started' && newStatus !== 'not-started') {
        topic.dateStarted = topic.dateStarted || getToday();
      }
      // Auto-set dateCompleted
      if (newStatus === 'mastered') {
        topic.dateCompleted = getToday();
      } else {
        topic.dateCompleted = null;
      }

      saveCurriculum(curriculum);
      notifyCurriculumUpdate();
      refreshPanel();
      bindPanelInputListeners();
      showToast(`Status → ${statusLabel(newStatus)}`);
    }

    /* Set confidence */
    if (action === 'set-confidence') {
      const val = parseInt(actionEl.dataset.value, 10);
      updateTopicField('confidence', val);
      notifyCurriculumUpdate();
      refreshPanel();
      bindPanelInputListeners();
    }

    /* Practice counter */
    if (action === 'practice-inc') {
      const topic = getCurrentTopic();
      if (!topic) return;
      updateTopicField('practiceCount', (topic.practiceCount || 0) + 1);
      const el = document.getElementById('td-practice-count');
      if (el) el.textContent = (topic.practiceCount || 0) + 1;
      store.incrementActivity(getToday(), 'problemsSolved', 1);
    }
    if (action === 'practice-dec') {
      const topic = getCurrentTopic();
      if (!topic) return;
      const newVal = Math.max(0, (topic.practiceCount || 0) - 1);
      updateTopicField('practiceCount', newVal);
      const el = document.getElementById('td-practice-count');
      if (el) el.textContent = newVal;
    }

    /* Add resource */
    if (action === 'add-resource') {
      const input = document.getElementById('td-resource-input');
      if (!input) return;
      const url = input.value.trim();
      if (!url) return;

      const curriculum = getCurriculum();
      const topic = findTopic(curriculum, currentTrackId, currentModuleId, currentTopicId);
      if (!topic) return;

      if (!topic.resources) topic.resources = [];
      topic.resources.push(url);
      saveCurriculum(curriculum);

      input.value = '';
      const list = document.getElementById('td-resources-list');
      if (list) list.innerHTML = renderResources(topic.resources);
      showToast('Resource added');
    }

    /* Remove resource */
    if (action === 'remove-resource') {
      const idx = parseInt(actionEl.dataset.resourceIndex, 10);
      if (Number.isNaN(idx)) return;

      const curriculum = getCurriculum();
      const topic = findTopic(curriculum, currentTrackId, currentModuleId, currentTopicId);
      if (!topic || !topic.resources) return;

      topic.resources.splice(idx, 1);
      saveCurriculum(curriculum);

      const list = document.getElementById('td-resources-list');
      if (list) list.innerHTML = renderResources(topic.resources);
    }

    /* Show revision form */
    if (action === 'show-revision-form') {
      const form = document.getElementById('td-revision-form');
      const btn = document.getElementById('td-add-revision-btn');
      if (form) form.style.display = 'block';
      if (btn) btn.style.display = 'none';
    }

    /* Cancel revision */
    if (action === 'cancel-revision') {
      const form = document.getElementById('td-revision-form');
      const btn = document.getElementById('td-add-revision-btn');
      if (form) form.style.display = 'none';
      if (btn) btn.style.display = '';
    }

    /* Save revision */
    if (action === 'save-revision') {
      const notesEl = document.getElementById('td-revision-notes');
      const notes = notesEl ? notesEl.value.trim() : '';

      const curriculum = getCurriculum();
      const topic = findTopic(curriculum, currentTrackId, currentModuleId, currentTopicId);
      if (!topic) return;

      if (!topic.revisionHistory) topic.revisionHistory = [];
      topic.revisionHistory.push({ date: getToday(), notes });
      topic.status = 'revision';
      saveCurriculum(curriculum);
      notifyCurriculumUpdate();

      refreshPanel();
      bindPanelInputListeners();
      showToast('Revision recorded');
    }

    /* Mark as mastered */
    if (action === 'mark-mastered') {
      const curriculum = getCurriculum();
      const topic = findTopic(curriculum, currentTrackId, currentModuleId, currentTopicId);
      if (!topic) return;

      topic.status = 'mastered';
      topic.dateCompleted = getToday();
      topic.confidence = 5;
      if (!topic.dateStarted) topic.dateStarted = getToday();

      saveCurriculum(curriculum);
      notifyCurriculumUpdate();
      store.incrementActivity(getToday(), 'topicsCompleted', 1);

      refreshPanel();
      bindPanelInputListeners();
      launchConfetti();
      showToast('🏆 Topic Mastered!');
    }
  };
  panelEl.addEventListener('click', _onPanelClick);
}

/** Bind debounced input listeners for description and notes */
function bindPanelInputListeners() {
  const descEl = document.getElementById('td-description');
  if (descEl) {
    // Remove old listener by replacing the node (simple approach)
    const handler = debounce(() => {
      updateTopicField('description', descEl.value);
    }, 500);
    descEl.addEventListener('input', handler);
  }

  const notesEl = document.getElementById('td-notes');
  if (notesEl) {
    const handler = debounce(() => {
      updateTopicField('notes', notesEl.value);
    }, 500);
    notesEl.addEventListener('input', handler);
  }
}

/** Remove panel from DOM and clean up listeners */
export function destroy() {
  if (_onOpenTopic) document.removeEventListener('openTopicDetail', _onOpenTopic);
  if (_onKeydown) document.removeEventListener('keydown', _onKeydown);

  if (overlayEl) {
    if (_onOverlayClick) overlayEl.removeEventListener('click', _onOverlayClick);
    if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  }
  if (panelEl) {
    if (_onPanelClick) panelEl.removeEventListener('click', _onPanelClick);
    if (panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
  }

  overlayEl = null;
  panelEl = null;
  _onOpenTopic = null;
  _onPanelClick = null;
  _onOverlayClick = null;
  _onKeydown = null;

  currentTopicId = null;
  currentTrackId = null;
  currentModuleId = null;
}
