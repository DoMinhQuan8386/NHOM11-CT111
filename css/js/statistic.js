/* ================= 12. TRANG THỐNG KÊ ================= */

function renderStatisticsPage() {
  const sessions = appState.sessions || [];
  const totalMinutes = sessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  const studyDaysSet = new Set(sessions.filter((s) => Number(s.minutes) > 0).map((s) => s.date));

  const totalHoursEl = document.getElementById("statTotalHours");
  if (totalHoursEl) {
    totalHoursEl.innerHTML = `${(totalMinutes / 60).toFixed(1)} <small>giờ</small>`;
  }

  const totalDaysEl = document.getElementById("statTotalDays");
  if (totalDaysEl) {
    totalDaysEl.innerHTML = `${studyDaysSet.size} <small>ngày</small>`;
  }

  const dateTotalsMap = {};
  sessions.forEach((s) => {
    dateTotalsMap[s.date] = (dateTotalsMap[s.date] || 0) + (Number(s.minutes) || 0);
  });

  let bestDay = "Chưa có";
  let maxMinutes = 0;

  for (const [dateStr, mins] of Object.entries(dateTotalsMap)) {
    if (mins > maxMinutes) {
      maxMinutes = mins;
      bestDay = dateStr;
    }
  }

  const bestDayEl = document.getElementById("statBestDay");
  const bestDayMinsEl = document.getElementById("statBestDayMins");
  if (bestDayEl && bestDayMinsEl) {
    if (maxMinutes > 0) {
      const parsedDate = new Date(bestDay);
      bestDayEl.textContent = `${maxMinutes} phút`;
      bestDayMinsEl.textContent = `Vào ngày ${parsedDate.toLocaleDateString("vi-VN")}`;
    } else {
      bestDayEl.textContent = "0 phút";
      bestDayMinsEl.textContent = "Chưa có phiên học";
    }
  }

  const pomodoroCount = sessions.filter((s) => s.type === "focus").length;
  const pomoCountEl = document.getElementById("statTotalPomodoros");
  if (pomoCountEl) {
    pomoCountEl.innerHTML = `${pomodoroCount} <small>phiên</small>`;
  }

  renderWeeklyBarChart();
  renderCalendarHeatmap();
  renderFullSessionHistory();
}

function renderWeeklyBarChart() {
  const svg = document.getElementById("weeklyBarChartSvg");
  const totalPill = document.getElementById("weeklyTotalPill");
  if (!svg) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      dateKey: getTodayDateKey(d),
      label: d.toLocaleDateString("vi-VN", { weekday: "short" }),
      dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
      minutes: getMinutesOnDate(appState.sessions, getTodayDateKey(d))
    });
  }

  const totalWeekMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
  if (totalPill) {
    totalPill.textContent = `Tổng tuần: ${(totalWeekMinutes / 60).toFixed(1)} giờ (${totalWeekMinutes} phút)`;
  }

  const maxMins = Math.max(60, ...days.map((d) => d.minutes));
  const svgWidth = 700;
  const chartBottomY = 200;
  const maxBarHeight = 150;
  const colWidth = svgWidth / 7;
  const barWidth = 36;

  let elementsHtml = "";

  days.forEach((day, index) => {
    const x = index * colWidth + (colWidth - barWidth) / 2;
const barHeight = Math.max(day.minutes > 0 ? 8 : 3, (day.minutes / maxMins) * maxBarHeight);
    const y = chartBottomY - barHeight;
    const isToday = day.dateKey === getTodayDateKey();

    elementsHtml += `
      <g class="chart-col-group">
        <text class="chart-value-text" x="${x + barWidth / 2}" y="${y - 8}">
          ${day.minutes > 0 ? day.minutes + "m" : ""}
        </text>

        <rect class="chart-bar-rect" 
              x="${x}" 
              y="${y}" 
              width="${barWidth}" 
              height="${barHeight}">
          <title>${day.label} (${day.dateLabel}): ${day.minutes} phút học tập</title>
        </rect>

        <text class="chart-axis-text" x="${x + barWidth / 2}" y="${chartBottomY + 20}" style="font-weight: ${isToday ? "700" : "500"}; fill: ${isToday ? "var(--lavender-dark)" : "var(--text-muted)"}">
          ${day.label}
        </text>
        <text class="chart-axis-text" x="${x + barWidth / 2}" y="${chartBottomY + 34}" style="font-size: 10px;">
          ${day.dateLabel}
        </text>
      </g>
    `;
  });

  svg.innerHTML = elementsHtml;
}

function renderCalendarHeatmap() {
  const container = document.getElementById("calendarHeatmapGrid");
  const tooltip = document.getElementById("heatmapTooltip");
  if (!container) return;

  const sessions = appState.sessions || [];
  const dateTotalsMap = {};
  sessions.forEach((s) => {
    dateTotalsMap[s.date] = (dateTotalsMap[s.date] || 0) + (Number(s.minutes) || 0);
  });

  const totalDays = 52 * 7;
  const cellsHtml = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (totalDays - 1));

  for (let i = 0; i < totalDays; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    const key = getTodayDateKey(current);
    const mins = dateTotalsMap[key] || 0;

    let level = 0;
    if (mins >= 120) level = 4;
    else if (mins >= 60) level = 3;
    else if (mins >= 30) level = 2;
    else if (mins > 0) level = 1;

    cellsHtml.push(`
      <div class="heat-cell heat-level-${level}" 
           data-date="${key}" 
           data-mins="${mins}"></div>
    `);
  }

  container.innerHTML = cellsHtml.join("");

  const cells = container.querySelectorAll(".heat-cell");
  cells.forEach((cell) => {
    cell.addEventListener("mouseenter", (e) => {
      const date = cell.getAttribute("data-date");
      const mins = cell.getAttribute("data-mins");
      if (tooltip) {
        tooltip.innerHTML = `<strong>${date}</strong>: ${mins} phút học tập`;
        tooltip.style.opacity = "1";
        const rect = cell.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 8}px`;
      }
    });

    cell.addEventListener("mouseleave", () => {
      if (tooltip) tooltip.style.opacity = "0";
    });
  });
}

function renderFullSessionHistory() {
const container = document.getElementById("fullSessionHistoryList");
  if (!container) return;

  const sessions = [...appState.sessions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-placeholder">
        <div class="empty-placeholder-icon">📚</div>
        <p>Chưa có dữ liệu phiên học nào trong nhật ký.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sessions
    .map((s) => {
      const timeStr = s.createdAt ? new Date(s.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
      return `
        <div class="session-item">
          <div class="session-left">
            <div class="session-icon">${s.type === "focus" ? "🍅" : "⏱"}</div>
            <div class="session-info">
              <strong>${escapeHtml(s.label || "Phiên học")}</strong>
              <small>${s.date} • ${timeStr}</small>
            </div>
          </div>
          <span class="session-duration">${s.minutes} phút</span>
        </div>
      `;
    })
    .join("");
}

/* ================= 13. TRANG MỤC TIÊU & GAMIFICATION ================= */

function setupGoalsPage() {
  const dailyTargetForm = document.getElementById("dailyTargetForm");
  if (dailyTargetForm) {
    dailyTargetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = parseFloat(document.getElementById("dailyTargetHoursInput")?.value);
      if (val && val >= 0.5 && val <= 14) {
        appState.settings.dailyGoalHours = val;
        saveStateToStorage();
        evaluateAndAwardBadges();
        renderAllViews();
        showToast(`Đã cập nhật mục tiêu: ${val} giờ mỗi ngày! 🎯`, "success");
      }
    });
  }

  const addGoalForm = document.getElementById("addNewGoalForm");
  if (addGoalForm) {
    addGoalForm.addEventListener("submit", handleAddNewGoal);
  }

  const filterButtons = document.querySelectorAll(".filter-pill[data-filter]");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeGoalFilter = btn.getAttribute("data-filter");
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderGoalsList();
    });
  });

  document.getElementById("closeEditGoalModalBtn")?.addEventListener("click", closeEditGoalModal);
  document.getElementById("cancelEditGoalBtn")?.addEventListener("click", closeEditGoalModal);
  document.getElementById("editGoalForm")?.addEventListener("submit", handleSaveEditedGoal);

  const inputEl = document.getElementById("dailyTargetHoursInput");
  if (inputEl) inputEl.value = appState.settings.dailyGoalHours || 2;
}

function handleAddNewGoal(e) {
  e.preventDefault();

  const title = document.getElementById("goalTitleInput")?.value.trim();
  const desc = document.getElementById("goalDescInput")?.value.trim();
const targetHours = parseFloat(document.getElementById("goalTargetHoursInput")?.value);
  const category = document.getElementById("goalCategorySelect")?.value || "Khác";

  if (!title || !targetHours || targetHours <= 0) {
    showToast("Vui lòng nhập tên mục tiêu và số giờ hợp lệ!", "warning");
    return;
  }

  const newGoal = {
    id: "goal_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    title,
    description: desc,
    targetHours,
    currentHours: 0,
    category,
    completed: false,
    createdAt: Date.now()
  };

  appState.goals.push(newGoal);
  saveStateToStorage();

  e.target.reset();
  const targetInput = document.getElementById("goalTargetHoursInput");
  if (targetInput) targetInput.value = 20;

  renderGoalsList();
  showToast("Đã thêm mục tiêu học tập mới! 🚀", "success");
}

function renderGoalsList() {
  const container = document.getElementById("goalsCardsContainer");
  if (!container) return;

  let goals = appState.goals || [];

  if (activeGoalFilter === "in_progress") {
    goals = goals.filter((g) => !g.completed);
  } else if (activeGoalFilter === "completed") {
    goals = goals.filter((g) => g.completed);
  }

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 40px; margin-bottom: 12px;">🎯</div>
        <h4 style="font-size: 16px; margin-bottom: 6px; color: var(--pastel-navy-dark);">Chưa có mục tiêu nào trong mục này</h4>
        <p style="font-size: 12px; color: var(--text-muted);">Hãy thêm mục tiêu học tập mới ở cột bên trái để bắt đầu chinh phục!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = goals
    .map((goal) => {
      const percent = Math.min(100, Math.round(((goal.currentHours || 0) / Math.max(0.1, goal.targetHours)) * 100));
      return `
        <article class="goal-card-item ${goal.completed ? "status-done" : ""}">
          <div class="goal-card-top">
            <div class="goal-title-wrap">
              <span class="badge-tag badge-tag-blue" style="margin-bottom: 6px;">${escapeHtml(goal.category || "Học tập")}</span>
              <h4>${escapeHtml(goal.title)}</h4>
              ${goal.description ? `<p>${escapeHtml(goal.description)}</p>` : ""}
            </div>
            <span class="goal-badge-status ${goal.completed ? "status-completed" : "status-in-progress"}">
              ${goal.completed ? "✓ Đã hoàn thành" : "Đang thực hiện"}
            </span>
          </div>

          <div class="goal-progress-section">
            <div class="goal-progress-meta">
              <span>Đã học: ${goal.currentHours || 0} / ${goal.targetHours} giờ</span>
              <span>${percent}%</span>
            </div>
            <div class="goal-progress-bar">
              <div class="goal-progress-fill" style="width: ${percent}%;"></div>
            </div>
          </div>
<div class="goal-card-actions">
            <div class="goal-quick-add">
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Cộng nhanh:</span>
              <button class="btn-chip" onclick="quickAddGoalTime('${goal.id}', 0.5)">+30p</button>
              <button class="btn-chip" onclick="quickAddGoalTime('${goal.id}', 1)">+1h</button>
            </div>

            <div class="goal-mgmt-btns">
              <button class="btn btn-outline" style="padding: 5px 10px; font-size: 11px;" onclick="toggleGoalCompletion('${goal.id}')">
                ${goal.completed ? "Mở lại" : "✓ Xong"}
              </button>
              <button class="btn btn-outline" style="padding: 5px 10px; font-size: 11px;" onclick="openEditGoalModal('${goal.id}')">
                ✎ Sửa
              </button>
              <button class="btn btn-danger" style="padding: 5px 10px; font-size: 11px;" onclick="deleteGoal('${goal.id}')">
                ✕ Xóa
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

window.quickAddGoalTime = function (goalId, hoursToAdd) {
  const goal = (appState.goals || []).find((g) => g.id === goalId);
  if (!goal) return;

  goal.currentHours = Math.round(((goal.currentHours || 0) + hoursToAdd) * 10) / 10;
  if (goal.currentHours >= goal.targetHours && !goal.completed) {
    goal.completed = true;
    showToast(`Chúc mừng! Bạn đã hoàn thành mục tiêu: "${goal.title}"! 🎉`, "success");
    playRewardSound();
  }

  saveStateToStorage();
  renderGoalsList();
  showToast(`Đã thêm +${hoursToAdd} giờ vào "${goal.title}"`, "info");
};

window.toggleGoalCompletion = function (goalId) {
  const goal = (appState.goals || []).find((g) => g.id === goalId);
  if (!goal) return;

  goal.completed = !goal.completed;
  if (goal.completed) {
    goal.currentHours = goal.targetHours;
    playRewardSound();
    showToast(`Mục tiêu "${goal.title}" đã hoàn thành!`, "success");
  } else {
    showToast(`Đã chuyển "${goal.title}" về Đang thực hiện`, "info");
  }

  saveStateToStorage();
  renderGoalsList();
};

window.deleteGoal = function (goalId) {
  const goal = (appState.goals || []).find((g) => g.id === goalId);
  if (!goal) return;

  const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa mục tiêu "${goal.title}" không?`);
  if (!confirmDelete) return;

  appState.goals = appState.goals.filter((g) => g.id !== goalId);
  saveStateToStorage();
  renderGoalsList();
  showToast("Đã xóa mục tiêu thành công!", "info");
};

window.openEditGoalModal = function (goalId) {
  const goal = (appState.goals || []).find((g) => g.id === goalId);
  if (!goal) return;

  document.getElementById("editGoalId").value = goal.id;
  document.getElementById("editGoalTitleInput").value = goal.title;
  document.getElementById("editGoalDescInput").value = goal.description || "";
document.getElementById("editGoalTargetInput").value = goal.targetHours;
  document.getElementById("editGoalCurrentInput").value = goal.currentHours || 0;
  document.getElementById("editGoalCategorySelect").value = goal.category || "Học thuật";

  document.getElementById("editGoalModal")?.classList.add("active");
};

function closeEditGoalModal() {
  document.getElementById("editGoalModal")?.classList.remove("active");
}

function handleSaveEditedGoal(e) {
  e.preventDefault();

  const id = document.getElementById("editGoalId")?.value;
  const goal = (appState.goals || []).find((g) => g.id === id);
  if (!goal) return;

  const title = document.getElementById("editGoalTitleInput")?.value.trim();
  const desc = document.getElementById("editGoalDescInput")?.value.trim();
  const target = parseFloat(document.getElementById("editGoalTargetInput")?.value);
  const current = parseFloat(document.getElementById("editGoalCurrentInput")?.value);
  const cat = document.getElementById("editGoalCategorySelect")?.value;

  if (!title || !target || target <= 0) {
    showToast("Vui lòng điền đủ tên và số giờ hợp lệ!", "warning");
    return;
  }

  goal.title = title;
  goal.description = desc;
  goal.targetHours = target;
  goal.currentHours = Math.max(0, current || 0);
  goal.category = cat;
  goal.completed = goal.currentHours >= goal.targetHours;

  saveStateToStorage();
  closeEditGoalModal();
  renderGoalsList();
  showToast("Đã lưu thay đổi mục tiêu thành công!", "success");
}

function renderBadgesShowcase() {
  const container = document.getElementById("fullBadgesShowcaseGrid");
  const progressTag = document.getElementById("badgesProgressTag");
  if (!container) return;

  const unlockedSet = new Set(appState.badges || []);
  if (progressTag) {
    progressTag.textContent = `${unlockedSet.size}/${BADGES_CONFIG.length} Mở khóa`;
  }

  container.innerHTML = BADGES_CONFIG.map((badge) => {
    const isUnlocked = unlockedSet.has(badge.id);
    return `
      <div class="badge-tile ${isUnlocked ? "unlocked" : "locked"}">
        <div class="badge-icon-box">${badge.icon}</div>
        <div class="badge-title">${escapeHtml(badge.title)}</div>
        <div class="badge-desc">${escapeHtml(badge.description)}</div>
        <span class="badge-status-pill ${isUnlocked ? "unlocked" : "locked"}">
          ${isUnlocked ? "✓ Đã mở khóa" : "🔒 Chưa mở"}
        </span>
      </div>
    `;
  }).join("");
}
