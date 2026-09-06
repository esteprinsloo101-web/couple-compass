/* Couple Compass — local-only relationship tools (not therapy) */
(function () {
  "use strict";

  const STORAGE_KEY = "couple-compass-pulse-v1";
  const MAX_HISTORY = 60;
  const HINTS = { 1: "Rough", 2: "Low", 3: "OK", 4: "Good", 5: "Steady" };

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    } catch (_) { /* quota / private mode */ }
  }

  function formatWhen(iso) {
    try {
      return new Date(iso).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch (_) {
      return iso;
    }
  }

  /* —— Pulse scale —— */
  let selectedPulse = null;
  const scaleEl = document.getElementById("pulse-scale");
  const formEl = document.getElementById("pulse-form");
  const noteEl = document.getElementById("pulse-note");
  const historyEl = document.getElementById("pulse-history");
  const chartEl = document.getElementById("pulse-chart");
  const nudgeEl = document.getElementById("pulse-low-nudge");
  const clearBtn = document.getElementById("clear-pulse");

  function renderScale() {
    if (!scaleEl) return;
    scaleEl.innerHTML = "";
    for (let n = 1; n <= 5; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mood-btn" + (selectedPulse === n ? " active" : "");
      btn.setAttribute("aria-pressed", selectedPulse === n ? "true" : "false");
      btn.setAttribute("aria-label", "Pulse " + n + " — " + HINTS[n]);
      btn.innerHTML = n + '<span class="mood-hint">' + HINTS[n] + "</span>";
      btn.addEventListener("click", function () {
        selectedPulse = n;
        renderScale();
        if (nudgeEl) nudgeEl.hidden = n > 2;
      });
      scaleEl.appendChild(btn);
    }
  }

  function renderHistory() {
    const list = loadHistory();
    if (!historyEl || !chartEl) return;

    chartEl.innerHTML = "";
    const recent = list.slice(0, 14).reverse();
    if (recent.length === 0) {
      const empty = document.createElement("div");
      empty.className = "chart-bar empty";
      empty.style.height = "8px";
      chartEl.appendChild(empty);
    } else {
      recent.forEach(function (entry) {
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = Math.max(8, (entry.score / 5) * 56) + "px";
        bar.title = entry.score + "/5 · " + formatWhen(entry.at);
        chartEl.appendChild(bar);
      });
    }

    historyEl.innerHTML = "";
    if (list.length === 0) {
      const p = document.createElement("p");
      p.className = "history-empty";
      p.textContent = "No pulses yet — save your first above.";
      historyEl.appendChild(p);
      return;
    }
    list.slice(0, 20).forEach(function (entry) {
      const li = document.createElement("li");
      const score = document.createElement("span");
      score.className = "pulse-score";
      score.textContent = entry.score;
      const body = document.createElement("div");
      const meta = document.createElement("div");
      meta.className = "pulse-meta";
      meta.textContent = formatWhen(entry.at) + " · " + (HINTS[entry.score] || "");
      body.appendChild(meta);
      if (entry.note) {
        const note = document.createElement("div");
        note.textContent = entry.note;
        body.appendChild(note);
      }
      li.appendChild(score);
      li.appendChild(body);
      historyEl.appendChild(li);
    });
  }

  if (formEl) {
    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!selectedPulse) {
        alert("Pick a pulse from 1 to 5 first.");
        return;
      }
      const note = (noteEl && noteEl.value ? noteEl.value.trim() : "").slice(0, 280);
      const list = loadHistory();
      list.unshift({ score: selectedPulse, note: note, at: new Date().toISOString() });
      saveHistory(list);
      if (noteEl) noteEl.value = "";
      selectedPulse = null;
      renderScale();
      renderHistory();
      if (nudgeEl) nudgeEl.hidden = true;
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (!confirm("Clear all pulse history on this device?")) return;
      saveHistory([]);
      renderHistory();
    });
  }

  /* —— Modes —— */
  const gridEl = document.getElementById("mode-grid");
  const panelEl = document.getElementById("mode-panel");
  let activeModeId = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderModeList() {
    if (!gridEl || !window.CC_MODES) return;
    gridEl.innerHTML = "";
    window.CC_MODES.forEach(function (mode) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-card" + (activeModeId === mode.id ? " active" : "");
      btn.innerHTML =
        '<div class="mode-icon" aria-hidden="true">' + mode.icon + "</div>" +
        "<h3>" + escapeHtml(mode.title) + "</h3>" +
        "<p>" + escapeHtml(mode.blurb) + "</p>";
      btn.addEventListener("click", function () {
        activeModeId = mode.id;
        renderModeList();
        showMode(mode);
      });
      gridEl.appendChild(btn);
    });
  }

  function listHtml(items) {
    return "<ol>" + items.map(function (i) {
      return "<li>" + escapeHtml(i) + "</li>";
    }).join("") + "</ol>";
  }

  function scriptsHtml(items) {
    return items.map(function (s) {
      return '<div class="script-box">' + escapeHtml(s) + "</div>";
    }).join("");
  }

  function showMode(mode) {
    if (!panelEl) return;
    panelEl.hidden = false;
    panelEl.innerHTML =
      "<h3>" + escapeHtml(mode.icon + " " + mode.title) + "</h3>" +
      '<div class="proto-section"><h4>What’s going on</h4><p>' + escapeHtml(mode.what) + "</p></div>" +
      '<div class="proto-section"><h4>Try this</h4>' + listHtml(mode.tryThis) + "</div>" +
      '<div class="proto-section"><h4>Prompts</h4>' + listHtml(mode.prompts) + "</div>" +
      '<div class="proto-section"><h4>Sample scripts</h4>' + scriptsHtml(mode.scripts) + "</div>" +
      '<div class="proto-section"><h4>Why it helps</h4><p>' + escapeHtml(mode.why) + "</p></div>" +
      '<div class="warn-box"><strong>When to pause:</strong> ' + escapeHtml(mode.whenPause) + "</div>" +
      '<div class="step-nav">' +
      '<span class="step-label">Scenario card · not therapy</span>' +
      '<button type="button" class="btn btn-secondary" id="close-mode">Close</button>' +
      "</div>";
    const close = document.getElementById("close-mode");
    if (close) {
      close.addEventListener("click", function () {
        panelEl.hidden = true;
        activeModeId = null;
        renderModeList();
      });
    }
    panelEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  renderScale();
  renderHistory();
  renderModeList();
})();
