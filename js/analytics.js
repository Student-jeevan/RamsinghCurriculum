/**
 * analytics.js
 * Analytics dashboard with learning heatmap, monthly progress bar chart,
 * canvas donut skill distribution, time-by-track bars, and weekly summaries.
 * ES Module — exports render(), init(), destroy()
 */

import { store } from './store.js';
import { getToday, calculateStreak, getMonthName, getDayName, parseDate } from './utils.js';
import { getDefaultCurriculum } from './data.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const TRACK_COLORS = [
  'var(--accent-primary)',    // Track 0
  'var(--color-success)',     // Track 1
  'var(--color-warning)',     // Track 2
  '#e879f9',                 // Track 3 (purple/pink)
  '#fb923c'                  // Track 4 (orange)
];

const TRACK_COLOR_HEX = ['#6366f1', '#22c55e', '#eab308', '#e879f9', '#fb923c'];

/* ------------------------------------------------------------------ */
/*  Data helpers                                                      */
/* ------------------------------------------------------------------ */

function getActivity() {
  return store.getActivity() || {};
}

function getCurriculum() {
  return store.get('curriculum') || getDefaultCurriculum();
}

/** Build an array of Date objects for the last N days. */
function lastNDays(n) {
  const dates = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}

/** Format Date → YYYY-MM-DD */
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Map hours studied to heatmap level (0-4). */
function hoursToLevel(h) {
  if (!h || h <= 0) return 0;
  if (h <= 1) return 1;
  if (h <= 2) return 2;
  if (h <= 3) return 3;
  return 4;
}

/* ------------------------------------------------------------------ */
/*  Render                                                            */
/* ------------------------------------------------------------------ */

export function render() {
  return `
<div class="page">
  <div class="page-header">
    <h1 class="page-title">📊 Analytics</h1>
  </div>

  <div class="page-content">
    ${renderHeatmap()}
    <div class="analytics-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
      ${renderMonthlyProgress()}
      ${renderSkillDistribution()}
    </div>
    <div style="margin-top:1rem">
      ${renderTimeByTrack()}
    </div>
    <div style="margin-top:1rem">
      ${renderWeeklySummary()}
    </div>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/*  Section 1: Learning Heatmap                                       */
/* ------------------------------------------------------------------ */

function renderHeatmap() {
  const activity = getActivity();
  const days = lastNDays(182); // ~26 weeks ≈ 6 months

  // Calculate stats
  const activeDays = days.filter(d => {
    const a = activity[fmtDate(d)];
    return a && (a.hours > 0 || a.topicsCompleted > 0 || a.problemsSolved > 0);
  }).length;
  const streak = calculateStreak(activity);

  // Group days into weeks (columns). Each week = 7 cells, Mon(0) to Sun(6).
  // Pad the start so the first column starts on Monday.
  const firstDay = days[0];
  const firstDow = (firstDay.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const paddedDays = [];
  // Add null placeholders before the first real day
  for (let i = 0; i < firstDow; i++) paddedDays.push(null);
  paddedDays.push(...days);

  // Build week columns
  const weeks = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }
  // Pad last week to 7
  while (weeks.length && weeks[weeks.length - 1].length < 7) {
    weeks[weeks.length - 1].push(null);
  }

  // Month labels: detect when month changes across weeks
  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wIdx) => {
    // Find first real day in this week
    const realDay = week.find(d => d != null);
    if (realDay) {
      const m = realDay.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ weekIdx: wIdx, label: getMonthName(m).slice(0, 3) });
        lastMonth = m;
      }
    }
  });

  // Grid CSS: columns = weeks, rows = 7 (Mon-Sun)
  const totalWeeks = weeks.length;

  // Build cells row by row (row = day of week, col = week index)
  let cellsHTML = '';
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < totalWeeks; col++) {
      const d = weeks[col]?.[row] || null;
      if (!d) {
        cellsHTML += `<div class="heatmap-cell" data-level="0" style="grid-row:${row + 2};grid-column:${col + 2}"></div>`;
      } else {
        const dateStr = fmtDate(d);
        const a = activity[dateStr];
        const hours = a?.hours || 0;
        const level = hoursToLevel(hours);
        const tooltip = `${dateStr}: ${hours}h studied`;
        cellsHTML += `<div class="heatmap-cell" data-level="${level}" style="grid-row:${row + 2};grid-column:${col + 2}" title="${tooltip}"></div>`;
      }
    }
  }

  // Day labels on the left (grid column 1)
  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];
  const dayLabelsHTML = dayLabels.map((lbl, i) =>
    `<div style="grid-row:${i + 2};grid-column:1;font-size:.7rem;opacity:.5;display:flex;align-items:center;justify-content:flex-end;padding-right:6px">${lbl}</div>`
  ).join('');

  // Month labels in the top row
  const monthLabelsHTML = monthLabels.map(m =>
    `<span class="heatmap-month-label" style="grid-row:1;grid-column:${m.weekIdx + 2};font-size:.7rem;opacity:.6">${m.label}</span>`
  ).join('');

  return `
  <div class="card">
    <div class="card-header flex-between">
      <h3 class="card-title">Learning Heatmap</h3>
      <div class="flex-gap" style="font-size:.85rem">
        <span><strong>${activeDays}</strong> days active</span>
        <span>🔥 <strong>${streak}</strong> day streak</span>
      </div>
    </div>
    <div class="card-body" style="overflow-x:auto">
      <div class="heatmap-grid" style="display:grid;grid-template-columns:30px repeat(${totalWeeks}, 14px);grid-template-rows:20px repeat(7, 14px);gap:3px">
        ${monthLabelsHTML}
        ${dayLabelsHTML}
        ${cellsHTML}
      </div>
      <!-- Legend -->
      <div class="heatmap-legend" style="display:flex;align-items:center;gap:4px;margin-top:.75rem;font-size:.75rem;opacity:.7;justify-content:flex-end">
        <span>Less</span>
        <div class="heatmap-cell" data-level="0" style="width:14px;height:14px;display:inline-block;border-radius:2px"></div>
        <div class="heatmap-cell" data-level="1" style="width:14px;height:14px;display:inline-block;border-radius:2px"></div>
        <div class="heatmap-cell" data-level="2" style="width:14px;height:14px;display:inline-block;border-radius:2px"></div>
        <div class="heatmap-cell" data-level="3" style="width:14px;height:14px;display:inline-block;border-radius:2px"></div>
        <div class="heatmap-cell" data-level="4" style="width:14px;height:14px;display:inline-block;border-radius:2px"></div>
        <span>More</span>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/*  Section 2: Monthly Progress                                       */
/* ------------------------------------------------------------------ */

function renderMonthlyProgress() {
  const activity = getActivity();
  const now = new Date();

  // Last 6 months (including current)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  // Sum topicsCompleted per month
  const monthData = months.map(m => {
    let total = 0;
    const prefix = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
    Object.entries(activity).forEach(([dateStr, data]) => {
      if (dateStr.startsWith(prefix)) {
        total += data.topicsCompleted || 0;
      }
    });
    return { label: getMonthName(m.month).slice(0, 3), value: total };
  });

  const maxVal = Math.max(...monthData.map(d => d.value), 1);

  return `
  <div class="card">
    <div class="card-header"><h3 class="card-title">Monthly Progress</h3></div>
    <div class="card-body">
      <div class="bar-chart">
        ${monthData.map(d => `
        <div class="bar-chart-item">
          <div class="bar-chart-label">${d.label}</div>
          <div class="bar-chart-bar">
            <div style="width:${(d.value / maxVal) * 100}%;height:100%;background:linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));border-radius:4px;transition:width .4s"></div>
          </div>
          <div class="bar-chart-value">${d.value}</div>
        </div>`).join('')}
      </div>
      <div style="margin-top:.5rem;font-size:.8rem;opacity:.6">Topics completed per month</div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/*  Section 3: Skill Distribution (Canvas donut)                      */
/* ------------------------------------------------------------------ */

function renderSkillDistribution() {
  // We compute from curriculum data
  const curriculum = getCurriculum();
  const tracks = curriculum.tracks || [];

  const trackData = tracks.map((track, i) => {
    const topics = track.topics || [];
    const mastered = topics.filter(t => t.status === 'mastered').length;
    return {
      name: track.name || `Track ${i + 1}`,
      value: mastered,
      total: topics.length,
      color: TRACK_COLOR_HEX[i] || TRACK_COLOR_HEX[0]
    };
  });

  const totalMastered = trackData.reduce((s, d) => s + d.value, 0);
  const grandTotal = trackData.reduce((s, d) => s + d.total, 0) || 1;

  // Legend
  const legend = trackData.map(d => {
    const pct = grandTotal ? Math.round((d.value / grandTotal) * 100) : 0;
    return `
    <div style="display:flex;align-items:center;gap:.5rem;font-size:.85rem;margin-bottom:.25rem">
      <div style="width:12px;height:12px;border-radius:2px;background:${d.color};flex-shrink:0"></div>
      <span style="flex:1">${d.name}</span>
      <span style="opacity:.7">${d.value}/${d.total}</span>
      <span style="font-weight:600;min-width:35px;text-align:right">${pct}%</span>
    </div>`;
  }).join('');

  return `
  <div class="card">
    <div class="card-header"><h3 class="card-title">Skill Distribution</h3></div>
    <div class="card-body" style="text-align:center">
      <div class="donut-chart" style="position:relative;display:inline-block">
        <canvas id="donut-canvas" width="200" height="200" style="width:200px;height:200px"></canvas>
        <div class="donut-center" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">
          <div style="font-size:1.75rem;font-weight:700">${totalMastered}</div>
          <div style="font-size:.75rem;opacity:.6">mastered</div>
        </div>
      </div>
      <div style="text-align:left;margin-top:1rem">
        ${legend}
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/*  Section 4: Time by Track                                          */
/* ------------------------------------------------------------------ */

function renderTimeByTrack() {
  const curriculum = getCurriculum();
  const tracks = curriculum.tracks || [];

  // Since we don't track time per track, we show progress as proxy
  const trackProgress = tracks.map((track, i) => {
    const topics = track.topics || [];
    const total = topics.length || 1;
    const done = topics.filter(t => t.status === 'mastered' || t.status === 'revision').length;
    const pct = Math.round((done / total) * 100);
    return {
      name: track.name || `Track ${i + 1}`,
      pct,
      done,
      total,
      color: TRACK_COLORS[i] || TRACK_COLORS[0]
    };
  });

  return `
  <div class="card">
    <div class="card-header"><h3 class="card-title">Progress by Track</h3></div>
    <div class="card-body">
      <div class="time-distribution">
        ${trackProgress.map(t => `
        <div class="time-dist-row" style="display:flex;align-items:center;gap:.75rem;margin-bottom:.65rem">
          <div class="time-dist-label" style="min-width:160px;display:flex;align-items:center;gap:.5rem">
            <div style="width:10px;height:10px;border-radius:50%;background:${t.color};flex-shrink:0"></div>
            <span>${t.name}</span>
          </div>
          <div class="time-dist-bar" style="flex:1;height:20px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden">
            <div style="width:${t.pct}%;height:100%;background:${t.color};border-radius:4px;transition:width .4s"></div>
          </div>
          <div class="time-dist-value" style="min-width:80px;text-align:right;font-weight:600;font-size:.85rem">${t.done}/${t.total} (${t.pct}%)</div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/*  Section 5: Weekly Summary Cards                                   */
/* ------------------------------------------------------------------ */

function renderWeeklySummary() {
  const activity = getActivity();
  const now = new Date();

  // Build last 4 weeks
  const weekCards = [];
  for (let w = 0; w < 4; w++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (w * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    let hours = 0;
    let topics = 0;
    let problems = 0;

    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const key = fmtDate(d);
      const a = activity[key];
      if (a) {
        hours += a.hours || 0;
        topics += a.topicsCompleted || 0;
        problems += a.problemsSolved || 0;
      }
    }

    const startLabel = `${getMonthName(weekStart.getMonth()).slice(0, 3)} ${weekStart.getDate()}`;
    const endLabel = `${getMonthName(weekEnd.getMonth()).slice(0, 3)} ${weekEnd.getDate()}`;

    weekCards.push({ startLabel, endLabel, hours: Math.round(hours * 10) / 10, topics, problems, isCurrent: w === 0 });
  }

  return `
  <div class="card">
    <div class="card-header"><h3 class="card-title">Weekly Summary</h3></div>
    <div class="card-body">
      <div class="summary-cards" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:1rem">
        ${weekCards.map(wc => `
        <div class="summary-card card" style="${wc.isCurrent ? 'border-color:var(--accent-primary)' : ''}">
          <div class="card-body" style="text-align:center">
            <div style="font-size:.8rem;opacity:.6;margin-bottom:.5rem">${wc.startLabel} — ${wc.endLabel}${wc.isCurrent ? ' <span style="color:var(--accent-primary)">(current)</span>' : ''}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-top:.5rem">
              <div>
                <div style="font-size:1.2rem;font-weight:700">${wc.hours}</div>
                <div style="font-size:.7rem;opacity:.6">hours</div>
              </div>
              <div>
                <div style="font-size:1.2rem;font-weight:700">${wc.topics}</div>
                <div style="font-size:.7rem;opacity:.6">topics</div>
              </div>
              <div>
                <div style="font-size:1.2rem;font-weight:700">${wc.problems}</div>
                <div style="font-size:.7rem;opacity:.6">problems</div>
              </div>
            </div>
          </div>
        </div>`).join('')}
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

  // Draw the donut chart after DOM is ready
  requestAnimationFrame(() => drawDonutChart());
}

export function destroy() {
  if (_controller) {
    _controller.abort();
    _controller = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Canvas Donut Chart                                                */
/* ------------------------------------------------------------------ */

function drawDonutChart() {
  const canvas = document.getElementById('donut-canvas');
  if (!canvas) return;

  const curriculum = getCurriculum();
  const tracks = curriculum.tracks || [];

  const data = tracks.map((track, i) => {
    const mastered = (track.topics || []).filter(t => t.status === 'mastered').length;
    return {
      value: mastered || 0,
      color: TRACK_COLOR_HEX[i] || TRACK_COLOR_HEX[0]
    };
  });

  // Handle high-DPI screens
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = 200;
  const displayHeight = 200;
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const centerX = displayWidth / 2;
  const centerY = displayHeight / 2;
  const radius = Math.min(centerX, centerY) - 10;
  const innerRadius = radius * 0.65;
  let startAngle = -Math.PI / 2;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  // If all values are zero, draw an empty ring
  if (total === 0 || data.every(d => d.value === 0)) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.arc(centerX, centerY, innerRadius, 2 * Math.PI, 0, true);
    ctx.closePath();
    ctx.fillStyle = '#e5e7eb';
    ctx.fill();
    return;
  }

  data.forEach(item => {
    if (item.value <= 0) return;
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    startAngle += sliceAngle;
  });
}
