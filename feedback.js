* ================= 14. PHÂN HỆ GỬI PHẢN HỒI (FEEDBACK & SUPPORT) ================= */

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
