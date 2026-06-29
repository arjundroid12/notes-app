/* =============================================================
 * Notes App · vanilla JS
 * Features: markdown editor + preview, tags, search, localStorage,
 *           export/import JSON, dark mode
 * ============================================================= */

(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const STORAGE_KEY = "notesapp.notes";
  const THEME_KEY = "notesapp.theme";
  const ACTIVE_KEY = "notesapp.active";

  // ---------- State ----------
  const state = {
    notes: [],          // [{ id, title, body, tags: [], createdAt, updatedAt }]
    activeId: null,
    searchQuery: "",
    activeTag: null,
    currentTab: "write",
  };

  // ---------- DOM refs ----------
  const els = {
    notesList: $("#notesList"),
    newNoteBtn: $("#newNoteBtn"),
    searchInput: $("#searchInput"),
    tagsContainer: $("#tagsContainer"),
    noteCount: $("#noteCount"),
    exportBtn: $("#exportBtn"),
    importBtn: $("#importBtn"),
    importInput: $("#importInput"),
    themeToggle: $("#themeToggle"),

    editorEmpty: $("#editorEmpty"),
    editorContent: $("#editorContent"),
    noteTitle: $("#noteTitle"),
    noteBody: $("#noteBody"),
    notePreview: $("#notePreview"),
    noteTags: $("#noteTags"),
    noteTagInput: $("#noteTagInput"),
    noteMeta: $("#noteMeta"),
    deleteNoteBtn: $("#deleteNoteBtn"),
  };

  // ---------- Helpers ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const formatDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const formatMeta = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreview = (body) => {
    const text = (body || "").replace(/[#*`>\-_\[\]()!]/g, "").trim();
    return text.slice(0, 80);
  };

  // ---------- Persistence ----------
  const loadNotes = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.notes = raw ? JSON.parse(raw) : [];
    } catch {
      state.notes = [];
    }
    state.activeId = localStorage.getItem(ACTIVE_KEY) || null;
  };

  const saveNotes = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
    } catch (e) {
      console.warn("Could not save notes:", e);
    }
  };

  const saveActive = () => {
    if (state.activeId) {
      localStorage.setItem(ACTIVE_KEY, state.activeId);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  };

  // ---------- Note operations ----------
  const createNote = () => {
    const note = {
      id: uid(),
      title: "",
      body: "",
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.notes.unshift(note);
    state.activeId = note.id;
    saveNotes();
    saveActive();
    renderList();
    renderTags();
    renderEditor();
    els.noteTitle.focus();
  };

  const deleteNote = (id) => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    state.notes = state.notes.filter((n) => n.id !== id);
    if (state.activeId === id) state.activeId = null;
    saveNotes();
    saveActive();
    renderList();
    renderTags();
    renderEditor();
  };

  const selectNote = (id) => {
    state.activeId = id;
    saveActive();
    renderList();
    renderEditor();
  };

  const updateActive = (patch) => {
    const note = state.notes.find((n) => n.id === state.activeId);
    if (!note) return;
    Object.assign(note, patch, { updatedAt: Date.now() });
    saveNotes();
  };

  const getActiveNote = () => state.notes.find((n) => n.id === state.activeId);

  // ---------- Filtering ----------
  const getFilteredNotes = () => {
    const q = state.searchQuery.toLowerCase().trim();
    return state.notes.filter((n) => {
      if (state.activeTag && !(n.tags || []).includes(state.activeTag)) return false;
      if (!q) return true;
      const haystack = (n.title + " " + n.body + " " + (n.tags || []).join(" ")).toLowerCase();
      return haystack.includes(q);
    });
  };

  const getAllTags = () => {
    const set = new Set();
    state.notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  };

  // ---------- Render: list ----------
  const renderList = () => {
    const filtered = getFilteredNotes();
    els.notesList.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("li");
      empty.className = "note-item";
      empty.style.cursor = "default";
      empty.style.opacity = "0.6";
      empty.innerHTML = `<div class="note-item__title">No notes found</div>
        <div class="note-item__preview">${
          state.searchQuery ? "Try a different search." : "Click + New Note to begin."
        }</div>`;
      els.notesList.appendChild(empty);
    } else {
      filtered.forEach((n) => {
        const li = document.createElement("li");
        li.className = "note-item" + (n.id === state.activeId ? " is-active" : "");
        li.setAttribute("role", "option");
        li.setAttribute("tabindex", "0");
        li.innerHTML = `
          <div class="note-item__title">${escapeHtml(n.title || "Untitled note")}</div>
          <div class="note-item__preview">${escapeHtml(getPreview(n.body)) || "&nbsp;"}</div>
          <div class="note-item__meta">
            <span class="note-item__date">${formatDate(n.updatedAt)}</span>
            ${(n.tags || []).slice(0, 3).map((t) => `<span class="note-item__tag">${escapeHtml(t)}</span>`).join("")}
          </div>
        `;
        li.addEventListener("click", () => selectNote(n.id));
        li.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectNote(n.id);
          }
        });
        els.notesList.appendChild(li);
      });
    }

    els.noteCount.textContent = `${state.notes.length} note${state.notes.length !== 1 ? "s" : ""}`;
  };

  // ---------- Render: tags filter ----------
  const renderTags = () => {
    const tags = getAllTags();
    els.tagsContainer.innerHTML = "";
    tags.forEach((tag) => {
      const chip = document.createElement("button");
      chip.className = "tag-chip" + (state.activeTag === tag ? " is-active" : "");
      chip.type = "button";
      chip.textContent = `#${tag}`;
      chip.addEventListener("click", () => {
        state.activeTag = state.activeTag === tag ? null : tag;
        renderTags();
        renderList();
      });
      els.tagsContainer.appendChild(chip);
    });
  };

  // ---------- Render: editor ----------
  const renderEditor = () => {
    const note = getActiveNote();
    if (!note) {
      els.editorEmpty.hidden = false;
      els.editorContent.hidden = true;
      return;
    }
    els.editorEmpty.hidden = true;
    els.editorContent.hidden = false;

    els.noteTitle.value = note.title || "";
    els.noteBody.value = note.body || "";
    els.noteMeta.textContent = `Edited ${formatMeta(note.updatedAt)}`;
    renderNoteTags(note);
    renderPreview();
    setTab(state.currentTab);
  };

  const renderNoteTags = (note) => {
    els.noteTags.innerHTML = "";
    (note.tags || []).forEach((tag) => {
      const span = document.createElement("span");
      span.className = "editor__tag";
      span.innerHTML = `#${escapeHtml(tag)}<button class="editor__tag-remove" type="button" aria-label="Remove tag">×</button>`;
      span.querySelector(".editor__tag-remove").addEventListener("click", () => {
        const n = getActiveNote();
        if (!n) return;
        n.tags = (n.tags || []).filter((t) => t !== tag);
        n.updatedAt = Date.now();
        saveNotes();
        renderNoteTags(n);
        renderList();
        renderTags();
      });
      els.noteTags.appendChild(span);
    });
  };

  const renderPreview = () => {
    const note = getActiveNote();
    if (!note) return;
    els.notePreview.innerHTML = window.Markdown.render(note.body || "");
  };

  // ---------- Tab switching ----------
  const setTab = (tab) => {
    state.currentTab = tab;
    $$(".tab-btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.tab === tab);
    });
    if (tab === "write") {
      els.noteBody.hidden = false;
      els.notePreview.hidden = true;
    } else {
      els.noteBody.hidden = true;
      els.notePreview.hidden = false;
      renderPreview();
    }
  };

  // ---------- Theme ----------
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    els.themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
  };

  const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      applyTheme("light");
    } else {
      applyTheme("dark");
    }
  };

  // ---------- Utils ----------
  const escapeHtml = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  // ---------- Event listeners ----------
  els.newNoteBtn.addEventListener("click", createNote);
  document.querySelectorAll('[data-action="new"]').forEach((b) =>
    b.addEventListener("click", createNote)
  );

  els.noteTitle.addEventListener("input", (e) => {
    updateActive({ title: e.target.value });
    renderList();
  });

  els.noteBody.addEventListener("input", (e) => {
    updateActive({ body: e.target.value });
    renderList();
    if (state.currentTab === "preview") renderPreview();
  });

  els.noteTagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = e.target.value.trim().replace(/^#/, "");
      if (!val) return;
      const note = getActiveNote();
      if (!note) return;
      if (!note.tags) note.tags = [];
      if (!note.tags.includes(val)) {
        note.tags.push(val);
        note.updatedAt = Date.now();
        saveNotes();
        renderNoteTags(note);
        renderList();
        renderTags();
      }
      e.target.value = "";
    }
  });

  els.deleteNoteBtn.addEventListener("click", () => {
    if (state.activeId) deleteNote(state.activeId);
  });

  els.searchInput.addEventListener(
    "input",
    debounce((e) => {
      state.searchQuery = e.target.value;
      renderList();
    }, 150)
  );

  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  els.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  // Keyboard shortcut: Cmd/Ctrl+N for new note
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "n") {
      e.preventDefault();
      createNote();
    }
  });

  // ---------- Export / Import ----------
  els.exportBtn.addEventListener("click", () => {
    const data = JSON.stringify(state.notes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notes-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  els.importBtn.addEventListener("click", () => els.importInput.click());

  els.importInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) throw new Error("Invalid file format");
      const valid = imported.filter(
        (n) => n && typeof n.title === "string" && typeof n.body === "string"
      );
      // Re-id to avoid clashes
      valid.forEach((n) => {
        n.id = uid();
        n.createdAt = n.createdAt || Date.now();
        n.updatedAt = n.updatedAt || Date.now();
        n.tags = Array.isArray(n.tags) ? n.tags : [];
      });
      state.notes = [...valid, ...state.notes];
      saveNotes();
      renderList();
      renderTags();
      alert(`Imported ${valid.length} note(s).`);
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      e.target.value = "";
    }
  });

  // ---------- Init ----------
  const init = () => {
    initTheme();
    loadNotes();
    if (state.notes.length === 0) {
      // Seed with a welcome note
      state.notes.unshift({
        id: uid(),
        title: "Welcome to Notes 👋",
        body: `# Welcome to Notes\n\nThis is a **markdown** notes app. Here are some things you can do:\n\n- ✍️ Write notes in **markdown**\n- 🏷 Add tags by typing in the tag input and pressing Enter\n- 🔍 Search across all your notes\n- 🎨 Toggle dark/light theme\n- ⬇ **Export** notes as JSON for backup\n\n## Markdown tips\n\nUse these syntax patterns:\n\n- \`# Heading\` for h1, \`## Heading\` for h2\n- \`**bold**\` and \`*italic*\`\n- \`[link](https://example.com)\`\n- \`- item\` for bullet lists\n- \`> quote\` for blockquotes\n\n> Tip: Press **Ctrl/Cmd + N** to create a new note quickly.\n\nHappy writing!`,
        tags: ["welcome", "guide"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      saveNotes();
    }
    if (!state.activeId || !getActiveNote()) {
      state.activeId = state.notes[0]?.id || null;
    }
    renderList();
    renderTags();
    renderEditor();
  };

  init();
})();
