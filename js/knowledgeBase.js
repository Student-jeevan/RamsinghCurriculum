/**
 * knowledgeBase.js
 * Personal wiki for storing and organizing notes with categories, tags,
 * search, and a debounced auto-save editor.
 * ES Module — exports render(), init(), destroy()
 */

import { store } from './store.js';
import { generateId, getToday, debounce, sanitizeHTML, showToast } from './utils.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { key: '', label: 'All Notes', icon: '📋' },
  { key: 'mathematics', label: 'Mathematics', icon: '📐' },
  { key: 'programming', label: 'Programming', icon: '💻' },
  { key: 'cs', label: 'Computer Science', icon: '🖥️' },
  { key: 'board', label: 'Board Preparation', icon: '🎓' }
];

const CATEGORY_LABELS = {
  mathematics: 'Mathematics',
  programming: 'Programming',
  cs: 'Computer Science',
  board: 'Board Prep'
};

/* ------------------------------------------------------------------ */
/*  State                                                             */
/* ------------------------------------------------------------------ */

/** Module-local UI state (not persisted). */
let _state = {
  filterCategory: '',
  filterTag: '',
  searchQuery: '',
  editingId: null // null = list view, string = editing that note
};

/* ------------------------------------------------------------------ */
/*  Data helpers                                                      */
/* ------------------------------------------------------------------ */

function getNotes() {
  return store.get('knowledge') || [];
}

function saveNotes(notes) {
  store.set('knowledge', notes);
}

function findNote(id) {
  return getNotes().find(n => n.id === id) || null;
}

/** Return filtered + sorted notes for the list view. */
function filteredNotes() {
  let notes = getNotes();

  // Category
  if (_state.filterCategory) {
    notes = notes.filter(n => n.category === _state.filterCategory);
  }

  // Tag
  if (_state.filterTag) {
    const tag = _state.filterTag.toLowerCase();
    notes = notes.filter(n => (n.tags || []).some(t => t.toLowerCase() === tag));
  }

  // Search
  if (_state.searchQuery) {
    const q = _state.searchQuery.toLowerCase();
    notes = notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }

  // Sort by most recently updated
  notes.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return notes;
}

/** All unique tags across all notes. */
function allTags() {
  const tags = new Set();
  getNotes().forEach(n => (n.tags || []).forEach(t => tags.add(t)));
  return [...tags].sort();
}

/* ------------------------------------------------------------------ */
/*  Render                                                            */
/* ------------------------------------------------------------------ */

export function render() {
  return `
<div class="page">
  <div class="page-header flex-between">
    <h1 class="page-title">📖 Knowledge Base</h1>
    <button class="btn btn-primary" id="btn-new-note">+ New Note</button>
  </div>

  <div class="page-content">
    <div style="display:flex;gap:1.25rem;align-items:flex-start">
      <!-- Sidebar filter -->
      <div style="min-width:200px;flex-shrink:0" id="kb-sidebar">
        ${renderSidebar()}
      </div>

      <!-- Main area -->
      <div style="flex:1;min-width:0" id="kb-main">
        ${_state.editingId ? renderEditor(_state.editingId) : renderList()}
      </div>
    </div>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/*  Sub-renderers                                                     */
/* ------------------------------------------------------------------ */

function renderSidebar() {
  const tags = allTags();

  return `
  <div class="card">
    <div class="card-body" style="padding:.75rem">
      <div style="font-weight:600;margin-bottom:.5rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.5px;opacity:.6">Categories</div>
      ${CATEGORIES.map(c => `
        <button class="btn ${_state.filterCategory === c.key ? 'btn-primary' : 'btn-ghost'} btn-sm kb-cat-btn"
                data-cat="${c.key}" style="width:100%;text-align:left;margin-bottom:.25rem;justify-content:flex-start">
          ${c.icon} ${c.label}
        </button>`).join('')}

      ${tags.length ? `
      <div style="font-weight:600;margin:.75rem 0 .5rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.5px;opacity:.6">Tags</div>
      <div style="display:flex;flex-wrap:wrap;gap:.35rem">
        ${tags.map(t => `
          <button class="badge kb-tag-btn ${_state.filterTag === t ? 'badge-mastered' : ''}"
                  data-tag="${sanitizeHTML(t)}" style="cursor:pointer">${sanitizeHTML(t)}</button>
        `).join('')}
      </div>` : ''}
    </div>
  </div>`;
}

function renderList() {
  const notes = filteredNotes();

  return `
  <div style="margin-bottom:1rem">
    <input class="input" id="kb-search" type="text" placeholder="Search notes…"
           value="${sanitizeHTML(_state.searchQuery)}" style="width:100%" />
  </div>

  ${notes.length ? `
  <div class="grid grid-auto" id="kb-notes-grid">
    ${notes.map(n => {
      const preview = (n.content || '').slice(0, 100).replace(/\n/g, ' ');
      const catLabel = CATEGORY_LABELS[n.category] || n.category || 'Uncategorised';
      return `
      <div class="card kb-note-card" data-id="${n.id}" style="cursor:pointer">
        <div class="card-body">
          <div class="flex-between" style="margin-bottom:.35rem">
            <span style="font-weight:600;font-size:1rem">${sanitizeHTML(n.title || 'Untitled')}</span>
            <span class="badge badge-learning" style="font-size:.7rem">${sanitizeHTML(catLabel)}</span>
          </div>
          <div style="font-size:.85rem;opacity:.65;margin-bottom:.5rem;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
            ${sanitizeHTML(preview)}${preview.length >= 100 ? '…' : ''}
          </div>
          <div class="flex-between" style="font-size:.75rem;opacity:.5">
            <span>${n.updatedAt || n.createdAt || '—'}</span>
            <span>${(n.tags || []).map(t => '#' + sanitizeHTML(t)).join(' ')}</span>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>` : `
  <div class="empty-state">
    <div class="empty-icon">📝</div>
    <div class="empty-text">${_state.searchQuery || _state.filterCategory || _state.filterTag
      ? 'No notes match the current filters.'
      : 'Your knowledge base is empty. Create your first note!'}</div>
  </div>`}`;
}

function renderEditor(noteId) {
  const note = noteId === '__new__' ? {
    id: '__new__',
    title: '',
    category: _state.filterCategory || 'programming',
    content: '',
    tags: [],
    createdAt: getToday(),
    updatedAt: getToday()
  } : findNote(noteId);

  if (!note) {
    // Note was deleted externally — go back to list
    _state.editingId = null;
    return renderList();
  }

  return `
  <div id="kb-editor">
    <button class="btn btn-ghost btn-sm" id="btn-back-to-list" style="margin-bottom:1rem">← Back to notes</button>

    <div class="card">
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input class="input" id="ke-title" value="${sanitizeHTML(note.title || '')}" placeholder="Note title…" />
        </div>

        <div class="grid grid-2" style="gap:.75rem;margin-top:.75rem">
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="select" id="ke-category">
              ${CATEGORIES.filter(c => c.key).map(c =>
                `<option value="${c.key}" ${note.category === c.key ? 'selected' : ''}>${c.label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tags (comma-separated)</label>
            <input class="input" id="ke-tags" value="${sanitizeHTML((note.tags || []).join(', '))}" placeholder="algo, search, trees" />
          </div>
        </div>

        <div class="form-group" style="margin-top:.75rem">
          <label class="form-label">Content <span style="opacity:.5;font-weight:400">(markdown supported)</span></label>
          <textarea class="textarea" id="ke-content" rows="14" placeholder="Write your notes here…">${sanitizeHTML(note.content || '')}</textarea>
        </div>

        <div style="font-size:.75rem;opacity:.5;margin-top:.25rem">
          Last edited: ${note.updatedAt || note.createdAt || '—'}
          ${note.id !== '__new__' ? ` · Created: ${note.createdAt || '—'}` : ''}
        </div>

        <div class="flex-between" style="margin-top:1rem">
          <div class="flex-gap">
            <button class="btn btn-primary" id="btn-save-note">Save</button>
            <span id="autosave-indicator" style="font-size:.75rem;opacity:.5"></span>
          </div>
          ${note.id !== '__new__' ? `<button class="btn btn-danger btn-sm" id="btn-delete-note" data-id="${note.id}">Delete Note</button>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/*  Init / Destroy                                                    */
/* ------------------------------------------------------------------ */

let _controller = null;
let _debouncedAutoSave = null;

export function init() {
  _controller = new AbortController();
  const signal = _controller.signal;
  const root = document.getElementById('main-content');
  if (!root) return;

  // Create debounced auto-save (1.5s delay)
  _debouncedAutoSave = debounce(() => {
    if (_state.editingId && _state.editingId !== '__new__') {
      performSave(true);
    }
  }, 1500);

  root.addEventListener('click', handleClick, { signal });
  root.addEventListener('input', handleInput, { signal });
  root.addEventListener('change', handleChange, { signal });
}

export function destroy() {
  if (_controller) {
    _controller.abort();
    _controller = null;
  }
  _debouncedAutoSave = null;
  // Reset UI state (keep filters but clear editing)
  _state.editingId = null;
}

/* ------------------------------------------------------------------ */
/*  Event Handlers                                                    */
/* ------------------------------------------------------------------ */

function handleClick(e) {
  const target = e.target.closest('button') || e.target.closest('.kb-note-card');
  if (!target) return;

  /* New note */
  if (target.id === 'btn-new-note') {
    _state.editingId = '__new__';
    refreshMain();
    return;
  }

  /* Back to list */
  if (target.id === 'btn-back-to-list') {
    _state.editingId = null;
    refreshMain();
    refreshSidebar();
    return;
  }

  /* Save */
  if (target.id === 'btn-save-note') {
    performSave(false);
    return;
  }

  /* Delete */
  if (target.id === 'btn-delete-note') {
    deleteNote(target.dataset.id);
    return;
  }

  /* Category filter */
  if (target.classList.contains('kb-cat-btn')) {
    _state.filterCategory = target.dataset.cat;
    _state.editingId = null;
    refreshSidebar();
    refreshMain();
    return;
  }

  /* Tag filter */
  if (target.classList.contains('kb-tag-btn')) {
    const tag = target.dataset.tag;
    _state.filterTag = _state.filterTag === tag ? '' : tag;
    _state.editingId = null;
    refreshSidebar();
    refreshMain();
    return;
  }

  /* Open note */
  if (target.classList.contains('kb-note-card')) {
    _state.editingId = target.dataset.id;
    refreshMain();
    return;
  }
}

function handleInput(e) {
  /* Search */
  if (e.target.id === 'kb-search') {
    _state.searchQuery = e.target.value;
    // Refresh only the notes grid, keeping the search input focused
    const grid = document.getElementById('kb-notes-grid');
    const empty = document.querySelector('.empty-state');
    const container = grid?.parentElement || empty?.parentElement;
    if (container) {
      // Rebuild list HTML minus the search bar
      const notes = filteredNotes();
      const gridHTML = notes.length ? renderNotesGrid(notes) : renderEmptyNotes();
      // Replace everything after the search bar
      const searchBar = document.getElementById('kb-search')?.parentElement;
      if (searchBar && searchBar.nextElementSibling) {
        searchBar.nextElementSibling.outerHTML = gridHTML;
      } else if (searchBar) {
        searchBar.insertAdjacentHTML('afterend', gridHTML);
      }
    }
    return;
  }

  /* Auto-save for editor fields */
  if (e.target.id === 'ke-title' || e.target.id === 'ke-content' || e.target.id === 'ke-tags') {
    if (_debouncedAutoSave) _debouncedAutoSave();
    const indicator = document.getElementById('autosave-indicator');
    if (indicator) indicator.textContent = 'Unsaved changes…';
  }
}

function handleChange(e) {
  /* Auto-save on category change */
  if (e.target.id === 'ke-category') {
    if (_debouncedAutoSave) _debouncedAutoSave();
  }
}

/* ------------------------------------------------------------------ */
/*  Actions                                                           */
/* ------------------------------------------------------------------ */

function performSave(isAutoSave) {
  const title = document.getElementById('ke-title')?.value.trim() || 'Untitled';
  const category = document.getElementById('ke-category')?.value || 'programming';
  const content = document.getElementById('ke-content')?.value || '';
  const tagsRaw = document.getElementById('ke-tags')?.value || '';
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  const notes = getNotes();

  if (_state.editingId === '__new__') {
    // Create new
    const newNote = {
      id: generateId(),
      title,
      category,
      content,
      tags,
      createdAt: getToday(),
      updatedAt: getToday()
    };
    notes.push(newNote);
    saveNotes(notes);
    _state.editingId = newNote.id;
    if (!isAutoSave) {
      showToast('Note created!', 'success');
      refreshMain();
      refreshSidebar();
    }
  } else {
    // Update existing
    const idx = notes.findIndex(n => n.id === _state.editingId);
    if (idx === -1) return;
    notes[idx] = { ...notes[idx], title, category, content, tags, updatedAt: getToday() };
    saveNotes(notes);
    if (!isAutoSave) {
      showToast('Note saved!', 'success');
    }
  }

  const indicator = document.getElementById('autosave-indicator');
  if (indicator) indicator.textContent = isAutoSave ? 'Auto-saved ✓' : '';
}

function deleteNote(id) {
  const notes = getNotes().filter(n => n.id !== id);
  saveNotes(notes);
  _state.editingId = null;
  refreshMain();
  refreshSidebar();
  showToast('Note deleted', 'info');
}

/* ------------------------------------------------------------------ */
/*  Refresh helpers                                                   */
/* ------------------------------------------------------------------ */

function refreshMain() {
  const el = document.getElementById('kb-main');
  if (el) el.innerHTML = _state.editingId ? renderEditor(_state.editingId) : renderList();
}

function refreshSidebar() {
  const el = document.getElementById('kb-sidebar');
  if (el) el.innerHTML = renderSidebar();
}

/** Notes grid only (no search bar). */
function renderNotesGrid(notes) {
  return `
  <div class="grid grid-auto" id="kb-notes-grid">
    ${notes.map(n => {
      const preview = (n.content || '').slice(0, 100).replace(/\n/g, ' ');
      const catLabel = CATEGORY_LABELS[n.category] || n.category || 'Uncategorised';
      return `
      <div class="card kb-note-card" data-id="${n.id}" style="cursor:pointer">
        <div class="card-body">
          <div class="flex-between" style="margin-bottom:.35rem">
            <span style="font-weight:600;font-size:1rem">${sanitizeHTML(n.title || 'Untitled')}</span>
            <span class="badge badge-learning" style="font-size:.7rem">${sanitizeHTML(catLabel)}</span>
          </div>
          <div style="font-size:.85rem;opacity:.65;margin-bottom:.5rem;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
            ${sanitizeHTML(preview)}${preview.length >= 100 ? '…' : ''}
          </div>
          <div class="flex-between" style="font-size:.75rem;opacity:.5">
            <span>${n.updatedAt || n.createdAt || '—'}</span>
            <span>${(n.tags || []).map(t => '#' + sanitizeHTML(t)).join(' ')}</span>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderEmptyNotes() {
  return `
  <div class="empty-state">
    <div class="empty-icon">📝</div>
    <div class="empty-text">${_state.searchQuery || _state.filterCategory || _state.filterTag
      ? 'No notes match the current filters.'
      : 'Your knowledge base is empty. Create your first note!'}</div>
  </div>`;
}
