/**
 * curriculum.js — Curriculum Explorer Page Module
 * 
 * Displays all 5 tracks with expandable modules and topics.
 * Supports status filter, search, checkbox status cycling,
 * and dispatches openTopicDetail events.
 */

import { store } from './store.js';
import { sanitizeHTML, showToast, getToday, debounce } from './utils.js';
import { getDefaultCurriculum } from './data.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

/** Set of currently expanded track IDs */
let expandedTracks = new Set();

/** Set of currently expanded module IDs */
let expandedModules = new Set();

/** Current filter values */
let statusFilter = 'all';
let searchQuery = '';

/* ------------------------------------------------------------------ */
/*  Private helpers                                                    */
/* ------------------------------------------------------------------ */

/** Get curriculum data */
function getCurriculum() {
  return store.get('curriculum') || getDefaultCurriculum();
}

/** Save curriculum data back to store */
function saveCurriculum(curriculum) {
  store.set('curriculum', curriculum);
}

/** Check if a topic passes current filters */
function topicPassesFilter(topic) {
  // Status filter
  if (statusFilter !== 'all' && topic.status !== statusFilter) return false;

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const titleMatch = (topic.title || '').toLowerCase().includes(q);
    const descMatch = (topic.description || '').toLowerCase().includes(q);
    if (!titleMatch && !descMatch) return false;
  }

  return true;
}

/** Count filtered topics in a module */
function filteredTopicCount(mod) {
  return mod.topics.filter(topicPassesFilter).length;
}

/** Count mastered topics in a list */
function masteredCount(topics) {
  return topics.filter(t => t.status === 'mastered').length;
}

/** Calculate percentage */
function pct(part, total) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** Get a nice label for a status */
function statusLabel(status) {
  const labels = {
    'not-started': 'Not Started',
    'learning': 'Learning',
    'revision': 'Revision',
    'mastered': 'Mastered'
  };
  return labels[status] || status;
}

/** Cycle topic status: not-started → learning → mastered */
function cycleStatus(currentStatus) {
  const cycle = {
    'not-started': 'learning',
    'learning': 'mastered',
    'revision': 'mastered',
    'mastered': 'not-started'
  };
  return cycle[currentStatus] || 'learning';
}

/** Render a single topic row */
function renderTopic(topic, trackId, moduleId) {
  const isMastered = topic.status === 'mastered';

  return `
    <div class="topic-item" data-topic-id="${topic.id}" data-track-id="${trackId}" data-module-id="${moduleId}">
      <label class="checkbox-wrapper" data-action="cycle-status" data-topic-id="${topic.id}" data-track-id="${trackId}" data-module-id="${moduleId}">
        <input type="checkbox" ${isMastered ? 'checked' : ''} data-action="cycle-status"
               data-topic-id="${topic.id}" data-track-id="${trackId}" data-module-id="${moduleId}" />
        <span class="checkbox-custom">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M2 7l3 3 7-7"/></svg>
        </span>
      </label>
      <span class="topic-name" data-action="open-detail" data-topic-id="${topic.id}" data-track-id="${trackId}" data-module-id="${moduleId}">
        ${sanitizeHTML(topic.title)}
      </span>
      <span class="topic-status">
        <span class="badge badge-${topic.status}">${statusLabel(topic.status)}</span>
      </span>
    </div>`;
}

/** Render a module section */
function renderModule(mod, trackId) {
  const isExpanded = expandedModules.has(mod.id);
  const totalTopics = mod.topics.length;
  const mastered = masteredCount(mod.topics);
  const percentage = pct(mastered, totalTopics);
  const filteredTopics = mod.topics.filter(topicPassesFilter);

  // If search/filter active and no matching topics, hide module
  if ((searchQuery || statusFilter !== 'all') && filteredTopics.length === 0) {
    return '';
  }

  const topicsHTML = isExpanded
    ? filteredTopics.map(t => renderTopic(t, trackId, mod.id)).join('')
    : '';

  return `
    <div class="module-item" data-module-id="${mod.id}">
      <div class="tree-header" data-action="toggle-module" data-module-id="${mod.id}">
        <span class="tree-toggle ${isExpanded ? 'expanded' : ''}">▶</span>
        <span class="tree-label">${sanitizeHTML(mod.name)}</span>
        <span class="tree-progress text-muted text-small">${mastered}/${totalTopics} · ${percentage}%</span>
      </div>
      <div class="tree-children ${isExpanded ? 'expanded' : ''}">
        ${topicsHTML}
      </div>
    </div>`;
}

/** Render a track section */
function renderTrack(track) {
  const isExpanded = expandedTracks.has(track.id);
  let totalTopics = 0;
  let mastered = 0;

  for (const mod of track.modules) {
    totalTopics += mod.topics.length;
    mastered += masteredCount(mod.topics);
  }

  const percentage = pct(mastered, totalTopics);

  // Count how many filtered topics exist in this track
  let filteredCount = 0;
  for (const mod of track.modules) {
    filteredCount += mod.topics.filter(topicPassesFilter).length;
  }

  // If filter/search active and no matching topics, hide track
  if ((searchQuery || statusFilter !== 'all') && filteredCount === 0) {
    return '';
  }

  const modulesHTML = isExpanded
    ? track.modules.map(m => renderModule(m, track.id)).join('')
    : '';

  return `
    <div class="track-section" data-track-id="${track.id}">
      <div class="track-section-header" data-action="toggle-track" data-track-id="${track.id}">
        <span class="tree-toggle ${isExpanded ? 'expanded' : ''}">▶</span>
        <span class="track-section-icon">${track.icon}</span>
        <div class="track-section-info">
          <span class="track-section-name">${sanitizeHTML(track.name)}</span>
          <span class="track-section-stats text-muted text-small">${mastered}/${totalTopics} topics · ${percentage}%</span>
        </div>
        <div class="progress-bar" style="width:120px;margin-left:auto;margin-right:1rem">
          <div class="progress-fill" style="width:${percentage}%;background:${track.colorRaw}"></div>
        </div>
      </div>
      <div class="tree-children ${isExpanded ? 'expanded' : ''}">
        ${modulesHTML}
      </div>
    </div>`;
}

/** Re-render just the curriculum body (tracks list) */
function rerenderTracks() {
  const container = document.getElementById('curriculum-tracks');
  if (!container) return;

  const curriculum = getCurriculum();
  const html = curriculum.tracks.map(t => renderTrack(t)).join('');
  container.innerHTML = html || `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">No topics match your filters</div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Returns the full curriculum explorer HTML */
export function render() {
  const curriculum = getCurriculum();

  return `
  <div class="page" id="curriculum-page">
    <div class="page-header">
      <h1 class="page-title">Curriculum</h1>
      <p class="page-subtitle">Explore and track your learning progress across all tracks</p>
    </div>

    <div class="curriculum-header">
      <div class="curriculum-filters flex flex-gap flex-wrap">
        <select class="curriculum-filter-select select" id="curriculum-status-filter" data-action="filter-status">
          <option value="all">All Statuses</option>
          <option value="not-started">Not Started</option>
          <option value="learning">Learning</option>
          <option value="revision">Revision</option>
          <option value="mastered">Mastered</option>
        </select>
        <input type="text" class="search-input input" id="curriculum-search"
               placeholder="Search topics…" data-action="search" />
      </div>
    </div>

    <div class="page-content">
      <div class="tree" id="curriculum-tracks">
        ${curriculum.tracks.map(t => renderTrack(t)).join('')}
      </div>
    </div>
  </div>`;
}

/** Event handler references for cleanup */
let _onClick = null;
let _onSearch = null;
let _onFilterChange = null;
let _onCurriculumUpdated = null;

/** Set up event listeners */
export function init() {
  const page = document.getElementById('curriculum-page');
  if (!page) return;

  // If filters were active, auto-expand all tracks/modules that have matches
  // (Reset filter state on fresh mount)
  statusFilter = 'all';
  searchQuery = '';

  /* ---------- Status filter dropdown ---------- */
  const filterSelect = document.getElementById('curriculum-status-filter');
  if (filterSelect) {
    _onFilterChange = () => {
      statusFilter = filterSelect.value;
      // When filtering, expand all to show results
      if (statusFilter !== 'all') {
        const curriculum = getCurriculum();
        curriculum.tracks.forEach(t => {
          expandedTracks.add(t.id);
          t.modules.forEach(m => expandedModules.add(m.id));
        });
      }
      rerenderTracks();
    };
    filterSelect.addEventListener('change', _onFilterChange);
  }

  /* ---------- Search input ---------- */
  const searchInput = document.getElementById('curriculum-search');
  if (searchInput) {
    _onSearch = debounce(() => {
      searchQuery = searchInput.value.trim();
      // Expand all when searching
      if (searchQuery) {
        const curriculum = getCurriculum();
        curriculum.tracks.forEach(t => {
          expandedTracks.add(t.id);
          t.modules.forEach(m => expandedModules.add(m.id));
        });
      }
      rerenderTracks();
    }, 200);
    searchInput.addEventListener('input', _onSearch);
  }

  /* ---------- Listen for external curriculum updates ---------- */
  _onCurriculumUpdated = () => {
    rerenderTracks();
  };
  document.addEventListener('curriculumUpdated', _onCurriculumUpdated);

  /* ---------- Delegated click handler ---------- */
  _onClick = (e) => {
    const target = e.target;
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    /* Toggle track expand/collapse */
    if (action === 'toggle-track') {
      const trackId = actionEl.dataset.trackId;
      if (expandedTracks.has(trackId)) {
        expandedTracks.delete(trackId);
      } else {
        expandedTracks.add(trackId);
      }
      rerenderTracks();
    }

    /* Toggle module expand/collapse */
    if (action === 'toggle-module') {
      const moduleId = actionEl.dataset.moduleId;
      if (expandedModules.has(moduleId)) {
        expandedModules.delete(moduleId);
      } else {
        expandedModules.add(moduleId);
      }
      rerenderTracks();
    }

    /* Cycle topic status via checkbox */
    if (action === 'cycle-status') {
      e.preventDefault();
      e.stopPropagation();

      const topicId = actionEl.dataset.topicId;
      const trackId = actionEl.dataset.trackId;
      const moduleId = actionEl.dataset.moduleId;

      const curriculum = getCurriculum();
      const track = curriculum.tracks.find(t => t.id === trackId);
      if (!track) return;
      const mod = track.modules.find(m => m.id === moduleId);
      if (!mod) return;
      const topic = mod.topics.find(t => t.id === topicId);
      if (!topic) return;

      const oldStatus = topic.status;
      topic.status = cycleStatus(oldStatus);

      // Auto-set dates
      if (oldStatus === 'not-started' && topic.status !== 'not-started') {
        topic.dateStarted = topic.dateStarted || getToday();
      }
      if (topic.status === 'mastered') {
        topic.dateCompleted = getToday();
      } else {
        topic.dateCompleted = null;
      }

      saveCurriculum(curriculum);
      showToast(`${topic.title}: ${statusLabel(topic.status)}`);

      // Log activity
      store.incrementActivity(getToday(), 'topicsCompleted', topic.status === 'mastered' ? 1 : 0);

      rerenderTracks();

      // Notify other modules
      document.dispatchEvent(new CustomEvent('curriculumUpdated'));
    }

    /* Open topic detail panel */
    if (action === 'open-detail') {
      const topicId = actionEl.dataset.topicId;
      const trackId = actionEl.dataset.trackId;
      const moduleId = actionEl.dataset.moduleId;

      document.dispatchEvent(new CustomEvent('openTopicDetail', {
        detail: { topicId, trackId, moduleId }
      }));
    }
  };

  page.addEventListener('click', _onClick);
}

/** Remove event listeners */
export function destroy() {
  const page = document.getElementById('curriculum-page');
  if (page && _onClick) page.removeEventListener('click', _onClick);

  const filterSelect = document.getElementById('curriculum-status-filter');
  if (filterSelect && _onFilterChange) filterSelect.removeEventListener('change', _onFilterChange);

  const searchInput = document.getElementById('curriculum-search');
  if (searchInput && _onSearch) searchInput.removeEventListener('input', _onSearch);

  if (_onCurriculumUpdated) document.removeEventListener('curriculumUpdated', _onCurriculumUpdated);

  _onClick = null;
  _onSearch = null;
  _onFilterChange = null;
  _onCurriculumUpdated = null;

  // Reset module-level state
  expandedTracks.clear();
  expandedModules.clear();
  statusFilter = 'all';
  searchQuery = '';
}
