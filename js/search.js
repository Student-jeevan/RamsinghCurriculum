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
        <div class="empty-state" style="padding:2rem">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">Start typing to search across topics, notes, and plans</div>
        </div>`;
    }
    return `
      <div class="empty-state" style="padding:2rem">
        <div class="empty-icon">😕</div>
        <div class="empty-text">No results found for "${sanitizeHTML(query)}"</div>
      </div>`;
  }

  // Group by type
  const groups = {};
  const groupLabels = { topic: 'Topics', knowledge: 'Knowledge Base', planner: 'Planner' };
  const groupOrder = ['topic', 'knowledge', 'planner'];

  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  }

  let html = '';
  for (const type of groupOrder) {
    if (!groups[type]) continue;

    html += `<div class="text-muted text-small" style="padding:0.5rem 1rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${groupLabels[type]}</div>`;

    for (const r of groups[type]) {
      const categoryBadge = r.category ? `<span class="badge" style="font-size:0.65rem">${sanitizeHTML(r.category)}</span>` : '';
      const snippetHTML = r.snippet ? `<div class="text-muted text-small" style="margin-top:0.25rem">${highlight(r.snippet, query)}</div>` : '';

      html += `
        <div class="list-item" data-action="select-result" data-route="${r.route}"
             data-detail='${JSON.stringify(r.detail).replace(/'/g, '&#39;')}'
             style="cursor:pointer;padding:0.75rem 1rem">
          <span style="font-size:1.25rem;margin-right:0.75rem;flex-shrink:0">${r.icon}</span>
          <div class="list-item-content" style="min-width:0">
            <div class="flex flex-gap" style="align-items:center;gap:0.5rem">
              <span class="list-item-title">${highlight(r.title, query)}</span>
              ${categoryBadge}
            </div>
            ${snippetHTML}
          </div>
        </div>`;
    }
  }

  return html;
}

/** Build the full modal inner HTML */
function buildModalHTML() {
  return `
    <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border)">
      <div class="flex" style="align-items:center;gap:0.75rem">
        <span style="font-size:1.25rem;opacity:0.5">🔍</span>
        <input type="text" class="input" id="global-search-input"
               placeholder="Search topics, notes, plans…"
               style="border:none;box-shadow:none;font-size:1rem;flex:1;padding:0.5rem 0" />
        <kbd style="font-size:0.7rem;padding:0.15rem 0.4rem;border:1px solid var(--border);border-radius:4px;color:var(--text-muted)">ESC</kbd>
      </div>
    </div>
    <div id="global-search-results" style="max-height:60vh;overflow-y:auto">
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
