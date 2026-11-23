/* ================= 9. RENDER TRANG CHỦ (DASHBOARD) ================= */

function renderDashboard() {
    const today = getTodayDateKey();
    const todayMinutes = getMinutesOnDate(appState.sessions, today);
    const targetMinutes = (appState.settings.dailyGoalHours || 2) * 60;
    const percent = Math.min(100, Math.round((todayMinutes / Math.max(1, targetMinutes)) * 100));
  
    const currentHour = new Date().getHours();
    let greeting = "Chào bạn! Chúc một ngày học tập hứng khởi.";
    if (currentHour < 12) greeting = "Chào buổi sáng! Hãy bắt đầu ngày mới thật tập trung nhé. 🌅";
    else if (currentHour < 18) greeting = "Chào buổi chiều! Duy trì nhịp độ học tập thật tốt nhé. ☀️";
    else greeting = "Chào buổi tối! Hoàn thành những mục tiêu cuối ngày nào. 🌙";
  
    const greetingEl = document.getElementById("greetingMessage");
    if (greetingEl) greetingEl.textContent = greeting;
  
    const now = new Date();
    const formattedDate = now.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    const dateDisplayEl = document.getElementById("currentDateDisplay");
    if (dateDisplayEl) dateDisplayEl.textContent = formattedDate;
  
    const streakEl = document.getElementById("dashStreakValue");
    if (streakEl) streakEl.innerHTML = `${appState.streak} <small>ngày</small>`;
  
    const streakNoteEl = document.getElementById("dashStreakNote");
    if (streakNoteEl) {
      const todayHasStudied = appState.sessions.some((s) => s.date === today && Number(s.minutes) > 0);
      streakNoteEl.textContent = todayHasStudied ? "✓ Hôm nay đã duy trì chuỗi!" : "Học một phiên để giữ chuỗi!";
    }
  
    const timeEl = document.getElementById("dashTodayTimeValue");
    if (timeEl) timeEl.innerHTML = `${todayMinutes} <small>phút</small>`;
  
    const goalEl = document.getElementById("dashTodayGoalValue");
    if (goalEl) goalEl.innerHTML = `${appState.settings.dailyGoalHours} <small>giờ</small>`;
  
    const goalPercentEl = document.getElementById("dashTodayGoalPercent");
    if (goalPercentEl) goalPercentEl.textContent = `Tiến độ: ${percent}%`;
  
    const badgesCountEl = document.getElementById("dashBadgesValue");
    if (badgesCountEl) badgesCountEl.innerHTML = `${appState.badges.length} <small>/ ${BADGES_CONFIG.length}</small>`;
  
    const circleEl = document.getElementById("dashboardProgressCircle");
    if (circleEl) {
      const circumference = 408.4;
      const offset = circumference - (percent / 100) * circumference;
      circleEl.style.strokeDashoffset = offset;
    }
  
    const circlePercentEl = document.getElementById("dashCirclePercent");
    if (circlePercentEl) circlePercentEl.textContent = `${percent}%`;
  
    const linearBarEl = document.getElementById("dashLinearProgressBar");
    if (linearBarEl) linearBarEl.style.width = `${percent}%`;
  
    const spentMinutesTextEl = document.getElementById("dashSpentMinutesText");
  if (spentMinutesTextEl) spentMinutesTextEl.textContent = `${todayMinutes} phút đã học`;
  
    const targetMinutesTextEl = document.getElementById("dashTargetMinutesText");
    if (targetMinutesTextEl) targetMinutesTextEl.textContent = `Mục tiêu: ${targetMinutes} phút`;
  
    const headlineEl = document.getElementById("dashProgressHeadline");
    const descEl = document.getElementById("dashProgressDesc");
    if (headlineEl && descEl) {
      if (percent >= 100) {
        headlineEl.textContent = "Tuyệt vời! Bạn đã hoàn thành mục tiêu ngày 🎉";
        descEl.textContent = `Bạn đã vượt chỉ tiêu với tổng cộng ${todayMinutes} phút học tập.`;
      } else if (todayMinutes > 0) {
        headlineEl.textContent = `Bạn đã hoàn thành ${percent}% mục tiêu!`;
        descEl.textContent = `Còn thiếu ${targetMinutes - todayMinutes} phút nữa để đạt mục tiêu hôm nay. Cố lên nhé!`;
      } else {
        headlineEl.textContent = "Hãy bắt đầu phiên học đầu tiên hôm nay!";
        descEl.textContent = `Bạn có mục tiêu ${targetMinutes} phút cho ngày hôm nay. Hãy mở đồng hồ Pomodoro nhé.`;
      }
    }
  
    renderDailyTasks();
    renderRecentSessions();
    renderDashboardMiniBadges();
  }
  
  function renderDailyTasks() {
    const listEl = document.getElementById("dailyTasksList");
    const counterBadge = document.getElementById("taskCounterBadge");
    if (!listEl) return;
  
    const tasks = appState.tasks || [];
    const completedCount = tasks.filter((t) => t.completed).length;
  
    if (counterBadge) {
      counterBadge.textContent = `${completedCount}/${tasks.length} hoàn thành`;
    }
  
    if (tasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty-placeholder" style="padding: 16px;">
          <div class="empty-placeholder-icon" style="font-size: 24px;">📝</div>
          <p style="font-size: 12px;">Chưa có nhiệm vụ nào hôm nay. Hãy thêm nhiệm vụ mới!</p>
        </div>
      `;
      return;
    }
  
    listEl.innerHTML = tasks
      .map(
        (task) => `
        <div class="task-item ${task.completed ? "completed" : ""}">
          <label class="task-checkbox-wrap" onclick="toggleTaskCompletion('${task.id}')">
            <div class="task-custom-checkbox">
              ${task.completed ? "✓" : ""}
            </div>
            <span class="task-text">${escapeHtml(task.text)}</span>
          </label>
          <button class="btn-task-del" onclick="deleteDailyTask('${task.id}')" title="Xóa nhiệm vụ">✕</button>
        </div>
      `
      )
      .join("");
  }
  
  function renderRecentSessions() {
    const container = document.getElementById("dashboardRecentSessions");
    if (!container) return;
  
    const sessions = [...appState.sessions]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 4);
  
    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-placeholder">
          <div class="empty-placeholder-icon">📖</div>
          <p>Chưa có phiên học nào. Bắt đầu với Pomodoro ngay!</p>
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
              <div class="session-icon">⏱</div>
              <div class="session-info">
                <strong>${escapeHtml(s.label || "Phiên tập trung Pomodoro")}</strong>
                <small>${s.date} ${timeStr ? "• " + timeStr : ""}</small>
              </div>
            </div>
            <span class="session-duration">+${s.minutes} phút</span>
          </div>
        `;
      })
      .join("");
  }
  
  function renderDashboardMiniBadges() {
    const container = document.getElementById("dashMiniBadgesList");
    if (!container) return;
  
    const unlocked = new Set(appState.badges || []);
  
    container.innerHTML = BADGES_CONFIG.map((b) => {
      const isUnlocked = unlocked.has(b.id);
      return `
        <div class="badge-tag ${isUnlocked ? "badge-tag-lavender" : "badge-tag-blue"}" 
             style="opacity: ${isUnlocked ? "1" : "0.45"}; filter: ${isUnlocked ? "none" : "grayscale(1)"}; cursor: pointer;"
             title="${escapeHtml(b.title)}: ${escapeHtml(b.description)} (${isUnlocked ? "Đã đạt" : "Chưa đạt"})"
             onclick="switchTab('goals')">
          <span>${b.icon}</span>
          <span>${escapeHtml(b.title)}</span>
        </div>
      `;
    }).join("");
  }
  
  /* ================= 10. ĐỒNG HỒ POMODORO ================= */
  
  function setupPomodoroTimer() {
    const modeButtons = document.querySelectorAll(".mode-btn[data-mode]");
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        setPomodoroMode(mode);
      });
    });
  
    const startPauseBtn = document.getElementById("timerStartPauseBtn");
    if (startPauseBtn) {
      startPauseBtn.addEventListener("click", handleTimerStartPauseClick);
    }
  
    const resetBtn = document.getElementById("timerResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetPomodoroTimer);
    }
  
    const settingsForm = document.getElementById("timerSettingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", handleTimerSettingsSubmit);
    }
  
    syncTimerSettingsInputs();
    setPomodoroMode("focus");
  }
  
  function syncTimerSettingsInputs() {
    const f = document.getElementById("customFocusInput");
    const s = document.getElementById("customShortInput");
    const l = document.getElementById("customLongInput");
  
    if (f) f.value = appState.settings.focusDuration || 25;
    if (s) s.value = appState.settings.shortDuration || 5;
    if (l) l.value = appState.settings.longDuration || 15;
  }
  
  function setPomodoroMode(mode) {
    if (timerState === "running") {
      const confirmSwitch = confirm("Phiên học đang diễn ra. Bạn có chắc muốn đổi chế độ?");
      if (!confirmSwitch) return;
    }
  
    stopPomodoroInterval();
    timerState = "stopped";
  timerMode = mode;
  
    let minutes = 25;
    if (mode === "focus") minutes = Number(appState.settings.focusDuration) || 25;
    else if (mode === "short") minutes = Number(appState.settings.shortDuration) || 5;
    else if (mode === "long") minutes = Number(appState.settings.longDuration) || 15;
  
    timerTotalSeconds = minutes * 60;
    timerRemainingSeconds = timerTotalSeconds;
  
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-mode") === mode);
    });
  
    const badgeEl = document.getElementById("timerModeBadge");
    if (badgeEl) {
      if (mode === "focus") badgeEl.textContent = "PHIÊN TẬP TRUNG";
      else if (mode === "short") badgeEl.textContent = "NGHỈ NGẮN THƯ GIÃN";
      else badgeEl.textContent = "NGHỈ DÀI HỒI PHỤC";
    }
  
    const noteEl = document.getElementById("timerStateNote");
    if (noteEl) noteEl.textContent = "Sẵn sàng bắt đầu phiên";
  
    updateTimerDisplay();
    updateTimerControlsButton();
  }
  
  function handleTimerStartPauseClick() {
    if (timerState === "stopped" || timerState === "paused") {
      startPomodoroTimer();
    } else if (timerState === "running") {
      pausePomodoroTimer();
    }
  }
  
  function startPomodoroTimer() {
    timerState = "running";
    timerTargetTimestamp = Date.now() + timerRemainingSeconds * 1000;
  
    stopPomodoroInterval();
  
    const noteEl = document.getElementById("timerStateNote");
    if (noteEl) {
      noteEl.textContent = timerMode === "focus" ? "Đang tập trung cao độ..." : "Đang nghỉ ngơi...";
    }
  
    updateTimerControlsButton();
  
    timerInterval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((timerTargetTimestamp - now) / 1000));
      timerRemainingSeconds = diff;
  
      updateTimerDisplay();
  
      if (timerRemainingSeconds <= 0) {
        completePomodoroSession();
      }
    }, 250);
  }
  
  function pausePomodoroTimer() {
    stopPomodoroInterval();
    timerState = "paused";
  
    const noteEl = document.getElementById("timerStateNote");
    if (noteEl) noteEl.textContent = "Đang tạm dừng (Bấm để tiếp tục)";
  
    updateTimerControlsButton();
  }
  
  function stopPomodoroInterval() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
  
  function resetPomodoroTimer() {
    stopPomodoroInterval();
    timerState = "stopped";
  
    let minutes = 25;
    if (timerMode === "focus") minutes = Number(appState.settings.focusDuration) || 25;
    else if (timerMode === "short") minutes = Number(appState.settings.shortDuration) || 5;
    else if (timerMode === "long") minutes = Number(appState.settings.longDuration) || 15;
  
    timerTotalSeconds = minutes * 60;
    timerRemainingSeconds = timerTotalSeconds;
  
    const noteEl = document.getElementById("timerStateNote");
    if (noteEl) noteEl.textContent = "Đã đặt lại thời gian";
  
    updateTimerDisplay();
    updateTimerControlsButton();
  }
  
  function updateTimerDisplay() {
    const mins = Math.floor(timerRemainingSeconds / 60);
  const secs = timerRemainingSeconds % 60;
    const timeString = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  
    const digitsEl = document.getElementById("timerDigitsDisplay");
    if (digitsEl) digitsEl.textContent = timeString;
  
    document.title = timerState === "running" ? `(${timeString}) StudyFlow - Pomodoro` : "StudyFlow - Habit Tracker";
  
    const circleEl = document.getElementById("timerProgressCircle");
    if (circleEl) {
      const circumference = 879.6;
      const fraction = timerTotalSeconds > 0 ? timerRemainingSeconds / timerTotalSeconds : 0;
      const offset = circumference * (1 - fraction);
      circleEl.style.strokeDashoffset = offset;
    }
  }
  
  function updateTimerControlsButton() {
    const btn = document.getElementById("timerStartPauseBtn");
    if (!btn) return;
  
    if (timerState === "running") {
      btn.innerHTML = "<span>⏸ Tạm dừng</span>";
      btn.className = "btn btn-secondary btn-timer-primary";
    } else if (timerState === "paused") {
      btn.innerHTML = "<span>▶ Tiếp tục (Resume)</span>";
      btn.className = "btn btn-primary btn-timer-primary";
    } else {
      btn.innerHTML = "<span>▶ Bắt đầu (Start)</span>";
      btn.className = "btn btn-primary btn-timer-primary";
    }
  }
  
  function completePomodoroSession() {
    stopPomodoroInterval();
    timerState = "stopped";
    timerRemainingSeconds = 0;
    updateTimerDisplay();
    updateTimerControlsButton();
  
    playChimeSound();
  
    const noteEl = document.getElementById("timerStateNote");
    if (noteEl) noteEl.textContent = "🎉 Phiên học đã hoàn thành!";
  
    if (timerMode === "focus") {
      const minutes = Number(appState.settings.focusDuration) || 25;
      recordStudySession(minutes, "focus", "Phiên Pomodoro tập trung");
  
      showToast(`Chúc mừng! Bạn đã hoàn thành ${minutes} phút tập trung sâu! 🍅`, "success");
  
      setTimeout(() => {
        setPomodoroMode("short");
      }, 1500);
    } else {
      showToast("Thời gian nghỉ ngơi đã hết! Sẵn sàng cho phiên học mới nhé! 🚀", "info");
      setTimeout(() => {
        setPomodoroMode("focus");
      }, 1500);
    }
  
    renderPomodoroStats();
  }
  
  function handleTimerSettingsSubmit(e) {
    e.preventDefault();
  
    const f = Math.max(1, Math.min(120, Number(document.getElementById("customFocusInput")?.value) || 25));
    const s = Math.max(1, Math.min(30, Number(document.getElementById("customShortInput")?.value) || 5));
    const l = Math.max(1, Math.min(60, Number(document.getElementById("customLongInput")?.value) || 15));
  
    appState.settings.focusDuration = f;
    appState.settings.shortDuration = s;
    appState.settings.longDuration = l;
  
    saveStateToStorage();
  
    if (timerState === "stopped") {
      resetPomodoroTimer();
    }
  
    showToast("Đã lưu cài đặt thời gian Pomodoro!", "success");
  }
  
  function renderPomodoroStats() {
    const today = getTodayDateKey();
    const todaySessions = (appState.sessions || []).filter((s) => s.date === today && s.type === "focus");
  const count = todaySessions.length;
    const mins = todaySessions.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  
    const countEl = document.getElementById("pomoTodayCount");
    if (countEl) countEl.textContent = count;
  
    const minsEl = document.getElementById("pomoTodayMinutes");
    if (minsEl) minsEl.textContent = mins;
  }
  
  /* ================= 11. GHI NHẬN PHIÊN HỌC ================= */
  
  function recordStudySession(minutes, type = "focus", label = "Phiên học tập") {
    if (!minutes || minutes <= 0) return;
  
    const today = getTodayDateKey();
    const newSession = {
      id: "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      date: today,
      minutes: Math.round(minutes),
      type: type,
      label: label,
      createdAt: Date.now()
    };
  
    appState.sessions.push(newSession);
  
    updateStreakCalculation();
    evaluateAndAwardBadges();
    saveStateToStorage();
    renderAllViews();
  }
  