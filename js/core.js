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
