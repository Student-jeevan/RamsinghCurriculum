/**
 * search.js — Global Search Modal Module
 *
 * Opens with Ctrl+K or a search icon click. Searches across
 * curriculum topics, knowledge base notes, and planner entries.
 * Results are grouped by category with highlighted matching text.
 */

import { store } from './store.js';
import { sanitizeHTML, debounce } from './utils.js';
import { getDefaultCurriculum } from './data.js';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let overlayEl = null;
let modalEl = null;
let isOpen = false;

/* ------------------------------------------------------------------ */
/*  Private helpers                                                    */
/* ------------------------------------------------------------------ */

/** Get curriculum data */
function getCurriculum() {
  return store.get('curriculum') || getDefaultCurriculum();
}

/** Escape special regex characters in a string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Highlight matching portions of text */
function highlight(text, query) {
  if (!query || !text) return sanitizeHTML(text || '');
  const escaped = escapeRegex(query);
  const regex = new RegExp(`(${escaped})`, 'gi');
  // Split on match, sanitize each part, wrap matches in <mark>
  return sanitizeHTML(text).replace(new RegExp(`(${escapeRegex(sanitizeHTML(query))})`, 'gi'), '<mark>$1</mark>');
}

/** Extract a short snippet around the first match */
function snippet(text, query, maxLen = 120) {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.substring(0, maxLen);

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 80);
  let result = '';
  if (start > 0) result += '…';
  result += text.substring(start, end);
  if (end < text.length) result += '…';
  return result;
}

/** Search curriculum topics */
function searchTopics(query) {
  const curriculum = getCurriculum();
  const results = [];
  const q = query.toLowerCase();

  for (const track of curriculum.tracks) {
    for (const mod of track.modules) {
      for (const topic of mod.topics) {
        const titleMatch = (topic.title || '').toLowerCase().includes(q);
        const descMatch = (topic.description || '').toLowerCase().includes(q);

        if (titleMatch || descMatch) {
          results.push({
            type: 'topic',
            icon: track.icon,
            title: topic.title,
            snippet: descMatch ? snippet(topic.description, query) : '',
            category: `${track.name} › ${mod.name}`,
            route: 'curriculum',
            detail: {
              topicId: topic.id,
              trackId: track.id,
              moduleId: mod.id
            }
          });
        }
      }
    }
  }
  return results;
}

/** Search knowledge base */
function searchKnowledge(query) {
  const knowledge = store.get('knowledge') || [];
  const results = [];
  const q = query.toLowerCase();

  for (const note of knowledge) {
    const titleMatch = (note.title || '').toLowerCase().includes(q);
    const contentMatch = (note.content || '').toLowerCase().includes(q);
    const tagMatch = (note.tags || []).some(t => t.toLowerCase().includes(q));

    if (titleMatch || contentMatch || tagMatch) {
      results.push({
        type: 'knowledge',
        icon: '📝',
        title: note.title || 'Untitled Note',
        snippet: contentMatch ? snippet(note.content, query) : (tagMatch ? `Tags: ${note.tags.join(', ')}` : ''),
        category: note.category || 'Knowledge Base',
        route: 'knowledge',
        detail: { noteId: note.id }
      });
    }
  }
  return results;
}

/** Search planner entries */
function searchPlanner(query) {
  const planner = store.get('planner') || {};
  const results = [];
  const q = query.toLowerCase();

  for (const [date, entry] of Object.entries(planner)) {
    const fields = ['objectives', 'difficult', 'questions', 'tomorrow'];
    let matched = false;
    let matchSnippet = '';

    for (const field of fields) {
      const val = entry[field];
      if (!val) continue;

      if (Array.isArray(val)) {
        // objectives may be array of strings or objects
        for (const item of val) {
          const text = typeof item === 'string' ? item : (item.text || '');
          if (text.toLowerCase().includes(q)) {
            matched = true;
            matchSnippet = snippet(text, query);
            break;
          }
        }
      } else if (typeof val === 'string' && val.toLowerCase().includes(q)) {
        matched = true;
        matchSnippet = snippet(val, query);
      }
      if (matched) break;
    }

    if (matched) {
      results.push({
        type: 'planner',
        icon: '📅',
        title: `Plan: ${date}`,
        snippet: matchSnippet,
        category: 'Planner',
        route: 'planner',
        detail: { date }
      });
    }
  }
  return results;
}

/** Run full search and return up to 20 results */
function runSearch(query) {
  if (!query || query.trim().length === 0) return [];

  const q = query.trim();
  const topics = searchTopics(q);
  const knowledge = searchKnowledge(q);
  const planner = searchPlanner(q);

  // Combine, cap at 20
  return [...topics, ...knowledge, ...planner].slice(0, 20);
}

/** Render search results HTML */
function renderResults(results, query) {
  if (results.length === 0) {
    if (!query || query.trim().length === 0) {
      return `
        <div style="padding: 1.5rem;">
          <!-- Category Quick Filters -->
          <div style="margin-bottom: 1.25rem;">
            <div class="text-muted text-small" style="font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">Browse by Category</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <button data-action="quick-search" data-query="math" class="btn btn-ghost" style="justify-content: flex-start; gap: 0.5rem; padding: 0.6rem 0.75rem; font-size: 0.8125rem;">
                <span style="font-size: 1.1rem;">📐</span> Mathematics
                <span class="text-muted text-small" style="margin-left: auto;">${getTrackCount('math')}</span>
              </button>
              <button data-action="quick-search" data-query="c " class="btn btn-ghost" style="justify-content: flex-start; gap: 0.5rem; padding: 0.6rem 0.75rem; font-size: 0.8125rem;">
                <span style="font-size: 1.1rem;">💻</span> Programming
                <span class="text-muted text-small" style="margin-left: auto;">${getTrackCount('programming')}</span>
              </button>
              <button data-action="quick-search" data-query="algorithm" class="btn btn-ghost" style="justify-content: flex-start; gap: 0.5rem; padding: 0.6rem 0.75rem; font-size: 0.8125rem;">
                <span style="font-size: 1.1rem;">⭐</span> Problem Solving
                <span class="text-muted text-small" style="margin-left: auto;">${getTrackCount('problem-solving')}</span>
              </button>
              <button data-action="quick-search" data-query="board" class="btn btn-ghost" style="justify-content: flex-start; gap: 0.5rem; padding: 0.6rem 0.75rem; font-size: 0.8125rem;">
                <span style="font-size: 1.1rem;">🎓</span> Board Prep
                <span class="text-muted text-small" style="margin-left: auto;">${getTrackCount('board')}</span>
              </button>
            </div>
          </div>

          <!-- Recent Activity -->
          ${renderRecentTopics()}

          <!-- Search Tips -->
          <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.5rem;">
            <div class="text-muted text-small" style="font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Search Tips</div>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted);">
              <span>💡 Type a topic name like <strong style="color: var(--text-secondary);">"functions"</strong> or <strong style="color: var(--text-secondary);">"sorting"</strong></span>
              <span>📝 Search your personal notes from the Knowledge Base</span>
              <span>📅 Find planner entries by keyword</span>
              <span>🔗 Click any result to jump directly to it</span>
            </div>
          </div>
        </div>`;
    }
    return `
      <div class="empty-state" style="padding: 2.5rem 1.5rem;">
        <div class="empty-icon">😕</div>
        <div class="empty-text" style="margin-bottom: 0.75rem;">No results found for "<strong>${sanitizeHTML(query)}</strong>"</div>
        <div class="text-muted text-small" style="max-width: 300px; margin: 0 auto; line-height: 1.6;">
          Try a different keyword, or check your spelling. You can search for topic names, note content, or planner entries.
        </div>
      </div>`;
  }

  // Group by type
  const groups = {};
  const groupLabels = { topic: 'Topics', knowledge: 'Knowledge Base', planner: 'Planner' };
  const groupIcons = { topic: '📚', knowledge: '📝', planner: '📅' };
  const groupOrder = ['topic', 'knowledge', 'planner'];

  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  }

  let html = `<div style="padding: 0.5rem 1rem 0.25rem; font-size: 0.7rem; color: var(--text-muted);">${results.length} result${results.length !== 1 ? 's' : ''} found</div>`;

  for (const type of groupOrder) {
    if (!groups[type]) continue;

    html += `<div class="text-muted text-small" style="padding: 0.5rem 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.4rem; border-top: 1px solid var(--border); margin-top: 0.25rem;">${groupIcons[type]} ${groupLabels[type]} <span style="font-weight: 400; opacity: 0.7;">(${groups[type].length})</span></div>`;

    for (const r of groups[type]) {
      const categoryBadge = r.category ? `<span class="badge" style="font-size: 0.6rem; padding: 0.1rem 0.4rem;">${sanitizeHTML(r.category)}</span>` : '';
      
      // Add status badge for topics
      let statusBadge = '';
      if (r.type === 'topic' && r.status) {
        const statusClass = `badge-${r.status}`;
        const statusLabel = r.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
        statusBadge = `<span class="badge ${statusClass}" style="font-size: 0.6rem; padding: 0.1rem 0.4rem; margin-left: 0.25rem;">${statusLabel}</span>`;
      }

      const snippetHTML = r.snippet ? `<div class="text-muted text-small" style="margin-top: 0.3rem; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${highlight(r.snippet, query)}</div>` : '';

      // Add confidence stars for topics
      let confidenceHTML = '';
      if (r.type === 'topic' && r.confidence > 0) {
        const stars = '★'.repeat(r.confidence) + '☆'.repeat(5 - r.confidence);
        confidenceHTML = `<span style="font-size: 0.65rem; color: #f1c40f; margin-left: 0.4rem;" title="Confidence: ${r.confidence}/5">${stars}</span>`;
      }

      html += `
        <div class="list-item" data-action="select-result" data-route="${r.route}"
             data-detail='${JSON.stringify(r.detail).replace(/'/g, '&#39;')}'
             style="cursor: pointer; padding: 0.65rem 1rem; border-bottom-color: transparent;">
          <span style="font-size: 1.2rem; margin-right: 0.6rem; flex-shrink: 0;">${r.icon}</span>
          <div class="list-item-content" style="min-width: 0;">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;">
              <span class="list-item-title" style="font-size: 0.8125rem;">${highlight(r.title, query)}</span>
              ${statusBadge}${confidenceHTML}
              ${categoryBadge}
            </div>
            ${snippetHTML}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0; opacity: 0.4;"><path d="M9 18l6-6-6-6"/></svg>
        </div>`;
    }
  }

  return html;
}

/** Get count of topics in a track */
function getTrackCount(trackId) {
  const curriculum = getCurriculum();
  const track = curriculum.tracks.find(t => t.id === trackId);
  if (!track) return '';
  let total = 0;
  for (const mod of track.modules) total += mod.topics.length;
  return `${total} topics`;
}

/** Render recently active topics (up to 5) */
function renderRecentTopics() {
  const curriculum = getCurriculum();
  const recent = [];
  for (const track of curriculum.tracks) {
    for (const mod of track.modules) {
      for (const topic of mod.topics) {
        if (topic.status !== 'not-started') {
          recent.push({
            icon: track.icon,
            title: topic.title,
            status: topic.status,
            trackName: track.name,
            moduleName: mod.name,
            topicId: topic.id,
            trackId: track.id,
            moduleId: mod.id,
            dateStarted: topic.dateStarted
          });
        }
      }
    }
  }

  // Sort by dateStarted (newest first), take 5
  recent.sort((a, b) => (b.dateStarted || '').localeCompare(a.dateStarted || ''));
  const top = recent.slice(0, 5);

  if (top.length === 0) return '';

  let html = `
    <div style="margin-bottom: 1rem;">
      <div class="text-muted text-small" style="font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">In Progress</div>`;

  for (const t of top) {
    const statusClass = `badge-${t.status}`;
    const statusLabel = t.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
    html += `
      <div class="list-item" data-action="select-result" data-route="curriculum"
           data-detail='${JSON.stringify({ topicId: t.topicId, trackId: t.trackId, moduleId: t.moduleId }).replace(/'/g, '&#39;')}'
           style="cursor: pointer; padding: 0.5rem 0.6rem; border-bottom-color: transparent;">
        <span style="font-size: 1rem; margin-right: 0.5rem;">${t.icon}</span>
        <div class="list-item-content" style="min-width: 0;">
          <span class="list-item-title" style="font-size: 0.8rem;">${sanitizeHTML(t.title)}</span>
          <span class="text-muted" style="font-size: 0.65rem; margin-left: 0.4rem;">${sanitizeHTML(t.trackName)}</span>
        </div>
        <span class="badge ${statusClass}" style="font-size: 0.6rem; padding: 0.1rem 0.4rem;">${statusLabel}</span>
      </div>`;
  }
  html += `</div>`;
  return html;
}

/** Build the full modal inner HTML */
function buildModalHTML() {
  return `
    <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);">
      <div class="flex" style="align-items: center; gap: 0.75rem;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" style="flex-shrink: 0;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="input" id="global-search-input"
               placeholder="Search topics, notes, plans…"
               style="border: none; box-shadow: none; background: transparent; font-size: 1rem; flex: 1; padding: 0.5rem 0;" />
        <kbd style="font-size: 0.65rem; padding: 0.15rem 0.5rem; border: 1px solid var(--border); border-radius: 4px; color: var(--text-muted); background: var(--bg-secondary); white-space: nowrap;">ESC</kbd>
      </div>
    </div>
    <div id="global-search-results" style="max-height: 60vh; overflow-y: auto;">
      ${renderResults([], '')}
    </div>`;
}

/** Open the search modal */
function openModal() {
  if (isOpen) return;
  isOpen = true;

  modalEl.innerHTML = buildModalHTML();
  overlayEl.classList.add('active');
  modalEl.classList.add('active');

  // Focus the input
  requestAnimationFrame(() => {
    const input = document.getElementById('global-search-input');
    if (input) {
      input.focus();
      bindSearchInput(input);
    }
  });
}

/** Close the search modal */
function closeModal() {
  if (!isOpen) return;
  isOpen = false;
  overlayEl.classList.remove('active');
  modalEl.classList.remove('active');
}

/** Toggle the search modal */
function toggleModal() {
  if (isOpen) closeModal();
  else openModal();
}

/** Bind the search input debounced handler */
function bindSearchInput(input) {
  const handler = debounce(() => {
    const query = input.value.trim();
    const results = runSearch(query);
    const container = document.getElementById('global-search-results');
    if (container) container.innerHTML = renderResults(results, query);
  }, 200);

  input.addEventListener('input', handler);
}

/* ------------------------------------------------------------------ */
/*  Event handler references                                           */
/* ------------------------------------------------------------------ */

let _onKeydown = null;
let _onOverlayClick = null;
let _onModalClick = null;
let _onOpenSearch = null;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Modal is appended to body; render returns empty string */
export function render() {
  return '';
}

/** Initialise: create DOM, bind global shortcut */
export function init() {
  // Create overlay
  overlayEl = document.createElement('div');
  overlayEl.className = 'modal-overlay';
  overlayEl.id = 'search-overlay';
  document.body.appendChild(overlayEl);

  // Create modal
  modalEl = document.createElement('div');
  modalEl.className = 'modal';
  modalEl.id = 'search-modal';
  modalEl.style.maxWidth = '600px';
  modalEl.style.width = '90%';
  document.body.appendChild(modalEl);

  /* ---------- Ctrl+K shortcut ---------- */
  _onKeydown = (e) => {
    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleModal();
      return;
    }
    // Escape to close
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closeModal();
    }
  };
  document.addEventListener('keydown', _onKeydown);

  /* ---------- Listen for openSearch event (from nav icon) ---------- */
  _onOpenSearch = () => openModal();
  document.addEventListener('openSearch', _onOpenSearch);

  /* ---------- Overlay click to close ---------- */
  _onOverlayClick = (e) => {
    if (e.target === overlayEl) closeModal();
  };
  overlayEl.addEventListener('click', _onOverlayClick);

  /* ---------- Delegated click inside modal ---------- */
  _onModalClick = (e) => {
    const target = e.target;
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === 'select-result') {
      const route = actionEl.dataset.route;
      let detail = {};
      try {
        detail = JSON.parse(actionEl.dataset.detail || '{}');
      } catch (_) { /* ignore */ }

      closeModal();

      // Navigate to the route
      document.dispatchEvent(new CustomEvent('navigate', { detail: { route } }));

      // If it's a topic, also open the detail panel after a short delay
      if (route === 'curriculum' && detail.topicId) {
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('openTopicDetail', { detail }));
        }, 300);
      }
    } else if (action === 'quick-search') {
      const query = actionEl.dataset.query;
      const input = document.getElementById('global-search-input');
      if (input) {
        input.value = query;
        // Trigger the input event to run search
        input.dispatchEvent(new Event('input'));
        input.focus();
      }
    }
  };
  modalEl.addEventListener('click', _onModalClick);
}

/** Remove modal from DOM and clean up */
export function destroy() {
  if (_onKeydown) document.removeEventListener('keydown', _onKeydown);
  if (_onOpenSearch) document.removeEventListener('openSearch', _onOpenSearch);

  if (overlayEl) {
    if (_onOverlayClick) overlayEl.removeEventListener('click', _onOverlayClick);
    if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  }

  if (modalEl) {
    if (_onModalClick) modalEl.removeEventListener('click', _onModalClick);
    if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
  }

  overlayEl = null;
  modalEl = null;
  isOpen = false;
  _onKeydown = null;
  _onOverlayClick = null;
  _onModalClick = null;
  _onOpenSearch = null;
}
