/**
 * ==========================================================================
 * STUDY HABIT TRACKER (STUDYFLOW) - JAVASCRIPT THUẦN (VANILLA JAVASCRIPT)
 * Phân hệ Quản lý Mục tiêu, Thói quen học tập, Pomodoro, Thống kê,
 * Gamification, Chế độ Tối Sang Trọng (Dark Luxury) & Gửi Phản Hồi
 * ==========================================================================
 */

"use strict";

/* ================= 1. HẰNG SỐ & CẤU HÌNH DỮ LIỆU ================= */
const STORAGE_KEY = "studyflow_data_v2";
const THEME_KEY = "studyflow_theme_mode";

// 5 Huy hiệu chuẩn theo yêu cầu đề bài
const BADGES_CONFIG = [
  {
    id: "first_study",
    title: "First Study",
    icon: "🌱",
    description: "Hoàn thành phiên học đầu tiên.",
    condition: (state) => (state.sessions || []).length >= 1
  },
  {
    id: "streak_3",
    title: "3 Days Streak",
    icon: "🔥",
    description: "Duy trì chuỗi ngày học liên tục trong 3 ngày.",
    condition: (state) => (state.streak || 0) >= 3
  },
  {
    id: "streak_7",
    title: "7 Days Streak",
    icon: "💎",
    description: "Duy trì chuỗi ngày học liên tục trong 7 ngày.",
    condition: (state) => (state.streak || 0) >= 7
  },
  {
    id: "focus_master",
    title: "Focus Master",
    icon: "👑",
    description: "Hoàn thành 10 phiên tập trung Pomodoro.",
    condition: (state) => (state.sessions || []).filter((s) => s.type === "focus").length >= 10
  },
  {
    id: "goal_achiever",
    title: "Goal Achiever",
    icon: "🎯",
    description: "Đạt mục tiêu số giờ học trong ngày.",
    condition: (state) => {
      const today = getTodayDateKey();
      const todayMins = getMinutesOnDate(state.sessions, today);
      const targetMins = (state.settings.dailyGoalHours || 2) * 60;
      return todayMins >= targetMins && targetMins > 0;
    }
  }
];

/* ================= 2. TRẠNG THÁI ỨNG DỤNG (STATE) ================= */
let appState = {
  settings: {
    dailyGoalHours: 2,
    focusDuration: 25,
    shortDuration: 5,
    longDuration: 15
  },
  sessions: [],
  tasks: [],
  goals: [],
  badges: [],
  feedbacks: [],
  lastStudyDate: "",
  streak: 0
};

// Trạng thái Pomodoro Timer
let timerMode = "focus"; // "focus" | "short" | "long"
let timerTotalSeconds = 25 * 60;
let timerRemainingSeconds = 25 * 60;
let timerState = "stopped"; // "stopped" | "running" | "paused"
let timerInterval = null;
let timerTargetTimestamp = 0;

// Trạng thái bộ lọc mục tiêu
let activeGoalFilter = "all"; // "all" | "in_progress" | "completed"

/* ================= 3. TRỢ THỦ LOCALSTORAGE & FORMATTER ================= */

/**
 * Lấy chuỗi định dạng ngày YYYY-MM-DD theo giờ địa phương
 */
function getTodayDateKey(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Đọc dữ liệu từ LocalStorage
 */
function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      appState = {
        settings: {
          dailyGoalHours: parsed.settings?.dailyGoalHours ?? 2,
          focusDuration: parsed.settings?.focusDuration ?? 25,
          shortDuration: parsed.settings?.shortDuration ?? 5,
          longDuration: parsed.settings?.longDuration ?? 15
        },
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        goals: Array.isArray(parsed.goals) ? parsed.goals : [],
        badges: Array.isArray(parsed.badges) ? parsed.badges : [],
        feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
        lastStudyDate: parsed.lastStudyDate || "",
        streak: parsed.streak || 0
      };
    } else {
      initializeDefaultData();
    }
  } catch (error) {
    console.error("Lỗi khi đọc dữ liệu LocalStorage:", error);
    initializeDefaultData();
  }

  // Tự động tính toán lại Streak chính xác mỗi khi tải trang
  updateStreakCalculation();
}

/**
 * Khởi tạo dữ liệu ban đầu phong phú
 */
function initializeDefaultData() {
  const today = getTodayDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getTodayDateKey(yesterday);

  appState = {
    settings: {
      dailyGoalHours: 2,
      focusDuration: 25,
      shortDuration: 5,
      longDuration: 15
    },
    sessions: [
      {
        id: "sess_demo_1",
        date: yesterdayKey,
        minutes: 25,
        type: "focus",
        label: "Ôn tập kiến thức Web",
        createdAt: Date.now() - 86400000
      },
      {
        id: "sess_demo_2",
        date: yesterdayKey,
        minutes: 25,
        type: "focus",
        label: "Làm bài tập JavaScript",
        createdAt: Date.now() - 82800000
      }
    ],
    tasks: [
      {
        id: "task_1",
        text: "Hoàn thành 2 phiên Pomodoro buổi sáng",
        completed: false,
        date: today
      },
      {
        id: "task_2",
        text: "Đọc 15 trang tài liệu Front-end",
        completed: false,
        date: today
      }
    ],
    goals: [
      {
        id: "goal_1",
        title: "Lập trình Web Front-end chuyên sâu",
        description: "Làm chủ HTML5, CSS3 hiện đại và Vanilla JavaScript.",
        targetHours: 30,
        currentHours: 12.5,
        category: "Lập trình",
        completed: false,
        createdAt: Date.now() - 100000000
      },
      {
        id: "goal_2",
        title: "Luyện thi từ vựng IELTS Band 7.0",
        description: "Mỗi ngày ghi nhớ 20 từ vựng theo chủ đề Academic.",
        targetHours: 20,
        currentHours: 20,
        category: "Ngoại ngữ",
        completed: true,
        createdAt: Date.now() - 200000000
      }
    ],
    badges: ["first_study"],
    feedbacks: [
      {
        id: "fb_demo_1",
        name: "Hoàng Minh",
        email: "minh@example.com",
        category: "Đánh giá giao diện & Trải nghiệm",
        rating: 5,
        message: "Giao diện website cực kỳ đẹp và mượt mà! Thích nhất là đồng hồ Pomodoro và biểu đồ nhiệt GitHub.",
        createdAt: Date.now() - 3600000,
        status: "Đã tiếp nhận"
      }
    ],
    lastStudyDate: yesterdayKey,
    streak: 1
  };

  saveStateToStorage();
}

/**
 * Lưu trạng thái vào LocalStorage
 */
function saveStateToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    console.error("Lỗi khi ghi vào LocalStorage:", error);
    showToast("Không thể lưu dữ liệu (Bộ nhớ đầy hoặc bị chặn)", "danger");
  }
}

/**
 * Lấy tổng số phút học trong một ngày cụ thể
 */
function getMinutesOnDate(sessions, dateKey) {
  if (!Array.isArray(sessions)) return 0;
  return sessions
    .filter((s) => s.date === dateKey)
    .reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
}

/**
 * Thoát ký tự HTML chống XSS
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

/* ================= 4. DARK MODE (CHẾ ĐỘ TỐI SANG TRỌNG) ================= */

function setupThemeMode() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const toggleIcon = document.getElementById("themeToggleIcon");
  const toggleText = document.getElementById("themeToggleText");

  // Kiểm tra theme đã lưu (Mặc định chọn Dark Mode sang trọng hoặc theo lưu trữ)
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      showToast(nextTheme === "dark" ? "Đã bật Chế độ Tối Sang Trọng 🌙" : "Đã bật Chế độ Sáng Thanh Lịch ☀️", "info");
    });
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (toggleIcon) toggleIcon.textContent = "☀️";
      if (toggleText) toggleText.textContent = "Chế độ Sáng";
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (toggleIcon) toggleIcon.textContent = "🌙";
      if (toggleText) toggleText.textContent = "Chế độ Tối";
    }
    localStorage.setItem(THEME_KEY, theme);
  }
}

/* ================= 5. THUẬT TOÁN TÍNH TOÁN STREAK & HUY HIỆU ================= */

function updateStreakCalculation() {
  const sessions = appState.sessions || [];
  const studyDaysSet = new Set(
    sessions.filter((s) => Number(s.minutes) > 0).map((s) => s.date)
  );

  const todayKey = getTodayDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getTodayDateKey(yesterday);

  let currentStreak = 0;
  let checkDate = new Date();

  if (studyDaysSet.has(todayKey)) {
    while (studyDaysSet.has(getTodayDateKey(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else if (studyDaysSet.has(yesterdayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
    while (studyDaysSet.has(getTodayDateKey(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else {
    currentStreak = 0;
  }

  appState.streak = currentStreak;

  const sortedDates = [...studyDaysSet].sort();
  if (sortedDates.length > 0) {
    appState.lastStudyDate = sortedDates[sortedDates.length - 1];
  }
}

function evaluateAndAwardBadges() {
  let newlyUnlocked = [];
  const existingBadges = new Set(appState.badges || []);

  BADGES_CONFIG.forEach((badge) => {
    if (!existingBadges.has(badge.id)) {
      if (badge.condition(appState)) {
        existingBadges.add(badge.id);
        newlyUnlocked.push(badge);
      }
    }
  });

  if (newlyUnlocked.length > 0) {
    appState.badges = [...existingBadges];
    saveStateToStorage();

    const firstNew = newlyUnlocked[0];
    showBadgeUnlockModal(firstNew);
    playRewardSound();
  }
}

/* ================= 6. ÂM THANH THÔNG BÁO (WEB AUDIO API) ================= */

function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.15);
      osc.stop(ctx.currentTime + idx * 0.15 + 0.55);
    });
  } catch (err) {
    console.warn("Web Audio API error:", err);
  }
}

function playRewardSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const melody = [440, 554.37, 659.25, 880];
    melody.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.01, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.45);
    });
  } catch (err) {
    console.warn("Audio Context error:", err);
  }
}

/* ================= 7. TOAST NOTIFICATION & MODALS ================= */

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: "✓",
    danger: "✕",
    warning: "⚠",
    info: "✦"
  };

  toast.innerHTML = `
    <span style="font-size: 16px;">${iconMap[type] || "✦"}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function showBadgeUnlockModal(badge) {
  const modal = document.getElementById("badgeUnlockModal");
  if (!modal) return;

  document.getElementById("unlockModalIcon").textContent = badge.icon;
  document.getElementById("unlockModalTitle").textContent = badge.title;
  document.getElementById("unlockModalDesc").textContent = badge.description;

  modal.classList.add("active");
}

function closeBadgeUnlockModal() {
  const modal = document.getElementById("badgeUnlockModal");
  if (modal) modal.classList.remove("active");
}

/* ================= 8. ĐIỀU HƯỚNG TAB (SPA NAVIGATION) ================= */

function setupNavigation() {
  const navButtons = document.querySelectorAll(".nav-link[data-tab]");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });

  document.getElementById("dashboardStartPomoBtn")?.addEventListener("click", () => {
    switchTab("pomodoro");
  });

  document.getElementById("dashboardSetGoalBtn")?.addEventListener("click", () => {
    switchTab("goals");
  });

  document.getElementById("goToBadgesBtn")?.addEventListener("click", () => {
    switchTab("goals");
    setTimeout(() => {
      document.getElementById("fullBadgesShowcaseGrid")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });

  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === `pane-${tabId}`);
  });

  const titles = {
    dashboard: "Tổng quan học tập",
    pomodoro: "Đồng hồ tập trung Pomodoro",
    statistics: "Thống kê & Tiến độ học tập",
    goals: "Mục tiêu học tập & Thành tích",
    feedback: "Trung tâm Góp ý & Phản hồi"
  };

  const breadcrumbs = {
    dashboard: "Tổng quan",
    pomodoro: "Pomodoro",
    statistics: "Thống kê",
    goals: "Mục tiêu",
    feedback: "Phản hồi & Hỗ trợ"
  };

  if (document.getElementById("pageHeaderTitle")) {
    document.getElementById("pageHeaderTitle").textContent = titles[tabId] || "StudyFlow";
  }

  if (document.getElementById("breadcrumbCurrent")) {
    document.getElementById("breadcrumbCurrent").textContent = breadcrumbs[tabId] || "Tổng quan";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (tabId === "statistics") {
    renderStatisticsPage();
  } else if (tabId === "feedback") {
    renderFeedbackList();
  }
}

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

/* ================= 14. PHÂN HỆ GỬI PHẢN HỒI (FEEDBACK & SUPPORT) ================= */

function setupFeedbackModule() {
  // Chọn sao đánh giá (Star Rating)
  const starButtons = document.querySelectorAll(".star-btn");
  const ratingInput = document.getElementById("fbRatingValue");
  const ratingText = document.getElementById("ratingNumberText");

  starButtons.forEach((star) => {
    star.addEventListener("click", () => {
      const rating = parseInt(star.getAttribute("data-rating"), 10);
      if (ratingInput) ratingInput.value = rating;
      if (ratingText) ratingText.textContent = `${rating} / 5 sao`;

      starButtons.forEach((s) => {
        const r = parseInt(s.getAttribute("data-rating"), 10);
        s.classList.toggle("active", r <= rating);
      });
    });
  });

  // Submit form phản hồi
  const form = document.getElementById("feedbackForm");
  if (form) {
    form.addEventListener("submit", handleFeedbackSubmit);
  }
}

function handleFeedbackSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("fbSenderName")?.value.trim();
  const email = document.getElementById("fbSenderEmail")?.value.trim();
  const category = document.getElementById("fbCategory")?.value || "Khác";
  const rating = parseInt(document.getElementById("fbRatingValue")?.value || "5", 10);
  const message = document.getElementById("fbMessage")?.value.trim();

  if (!name || !email || !message) {
    showToast("Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "warning");
    return;
  }

  const newFeedback = {
    id: "fb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    name,
    email,
    category,
    rating,
    message,
    createdAt: Date.now(),
    status: "Đã tiếp nhận"
  };

  appState.feedbacks.unshift(newFeedback);
  saveStateToStorage();

  // Reset form
  e.target.reset();

  // Đặt lại rating 5 sao
  const ratingInput = document.getElementById("fbRatingValue");
  if (ratingInput) ratingInput.value = 5;
  const ratingText = document.getElementById("ratingNumberText");
  if (ratingText) ratingText.textContent = "5 / 5 sao";
  document.querySelectorAll(".star-btn").forEach((s) => s.classList.add("active"));

  renderFeedbackList();
  playRewardSound();
  showToast("Cảm ơn bạn! Phản hồi đã được gửi và ghi nhận thành công 🎉", "success");
}

function renderFeedbackList() {
  const container = document.getElementById("feedbackHistoryList");
  const countBadge = document.getElementById("fbCountBadge");
  if (!container) return;

  const feedbacks = appState.feedbacks || [];
  if (countBadge) {
    countBadge.textContent = `${feedbacks.length} phản hồi`;
  }

  if (feedbacks.length === 0) {
    container.innerHTML = `
      <div class="empty-placeholder">
        <div class="empty-placeholder-icon">📬</div>
        <p>Chưa có phản hồi nào được gửi. Hãy gửi góp ý đầu tiên nhé!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = feedbacks
    .map((fb) => {
      const stars = "★".repeat(fb.rating || 5) + "☆".repeat(Math.max(0, 5 - (fb.rating || 5)));
      const timeStr = fb.createdAt ? new Date(fb.createdAt).toLocaleString("vi-VN") : "";
      return `
        <div class="feedback-card-item">
          <div class="feedback-card-top">
            <div class="feedback-user-info">
              <strong>${escapeHtml(fb.name)} <span style="font-weight: normal; color: var(--text-muted); font-size: 11px;">(${escapeHtml(fb.category)})</span></strong>
              <small>${escapeHtml(fb.email)} • ${timeStr}</small>
            </div>
            <div class="feedback-stars-display" title="${fb.rating} sao">${stars}</div>
          </div>

          <div class="feedback-card-body">
            ${escapeHtml(fb.message).replace(/\n/g, "<br>")}
          </div>

          <div class="feedback-card-foot">
            <span class="badge-tag badge-tag-mint">✓ ${escapeHtml(fb.status || "Đã tiếp nhận")}</span>
            <button class="btn-task-del" onclick="deleteFeedback('${fb.id}')" title="Xóa phản hồi này">✕ Xóa</button>
          </div>
        </div>
      `;
    })
    .join("");
}

window.deleteFeedback = function (fbId) {
  const confirmDel = confirm("Bạn có chắc chắn muốn xóa phản hồi này?");
  if (!confirmDel) return;

  appState.feedbacks = (appState.feedbacks || []).filter((f) => f.id !== fbId);
  saveStateToStorage();
  renderFeedbackList();
  showToast("Đã xóa phản hồi!", "info");
};

/* ================= 15. NHIỆM VỤ NGÀY ================= */

function setupDailyTasks() {
  const taskForm = document.getElementById("dailyTaskForm");
  if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("dailyTaskInput");
      const text = input?.value.trim();
      if (!text) return;

      const newTask = {
        id: "task_" + Date.now(),
        text,
        completed: false,
        date: getTodayDateKey()
      };

      appState.tasks.push(newTask);
      saveStateToStorage();
      input.value = "";
      renderDailyTasks();
      showToast("Đã thêm nhiệm vụ học tập mới!", "success");
    });
  }
}

window.toggleTaskCompletion = function (taskId) {
  const task = (appState.tasks || []).find((t) => t.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  saveStateToStorage();
  renderDailyTasks();

  if (task.completed) {
    playRewardSound();
  }
};

window.deleteDailyTask = function (taskId) {
  appState.tasks = (appState.tasks || []).filter((t) => t.id !== taskId);
  saveStateToStorage();
  renderDailyTasks();
};

/* ================= 16. NÚT THÊM NHANH PHIÊN HỌC & LÀM MỚI NHẬT KÝ ================= */

function setupQuickActions() {
  document.getElementById("quickAddSessionBtn")?.addEventListener("click", () => {
    recordStudySession(25, "manual", "Phiên học tự ghi nhận (+25m)");
    showToast("Đã ghi nhận nhanh 25 phút học tập cho hôm nay! ⏱", "success");
  });

  document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
    const confirmClear = confirm("Bạn có chắc chắn muốn làm mới nhật ký phiên học không? Các huy hiệu và mục tiêu vẫn được giữ nguyên.");
    if (!confirmClear) return;

    appState.sessions = [];
    updateStreakCalculation();
    saveStateToStorage();
    renderAllViews();
    showToast("Đã làm mới nhật ký phiên học!", "info");
  });

  document.getElementById("closeUnlockModalBtn")?.addEventListener("click", closeBadgeUnlockModal);
}

/* ================= 17. RENDER TOÀN DIỆN VÀ KHỞI TẠO ================= */

function renderAllViews() {
  renderDashboard();
  renderPomodoroStats();
  renderStatisticsPage();
  renderGoalsList();
  renderBadgesShowcase();
  renderFeedbackList();
}

function initStudyFlowApp() {
  loadStateFromStorage();
  setupThemeMode();
  setupNavigation();
  setupPomodoroTimer();
  setupGoalsPage();
  setupFeedbackModule();
  setupDailyTasks();
  setupQuickActions();
  renderAllViews();

  console.log("StudyFlow Study Habit Tracker initialized successfully.");
}

document.addEventListener("DOMContentLoaded", initStudyFlowApp);
