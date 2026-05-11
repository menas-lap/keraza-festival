// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
const session = requireRole("student");
let toggles   = {};

if (session) init();

async function init() {
  try {
    const opts = await apiGetOptions();
    toggles    = opts.toggles || { student_edit: true };
  } catch (err) {
    toggles = { student_edit: true };
  }
  loadStudentData();
  applyStudentToggle();
}

function loadStudentData() {
  const s = session.student;

  // Sidebar name
  document.getElementById("studentName").textContent = s.full_name || "—";

  // ID badge
  document.getElementById("studentIdBadge").textContent = s.student_id || "—";

  // Photos
  if (s.personal_photo) {
    const img = document.getElementById("profilePhoto");
    img.src = driveThumb(s.personal_photo);
    img.style.display = "block";
  }
  if (s.birth_cert) {
    const img = document.getElementById("birthCertImg");
    img.src = driveThumb(s.birth_cert);
    img.style.display = "block";
  }

  // Info fields
  const fields = {
    fullName:    s.full_name,
    stage:       s.stage,
    service:     s.service,
    gender:      s.gender,
    birthDate:   s.birth_date ? String(s.birth_date).split("T")[0] : "—",
    family:      s.family      || "—",
    parentPhone: s.parent_phone,
    studentPhone:s.student_phone || "—",
  };

  Object.entries(fields).forEach(([key, val]) => {
    const el = document.getElementById("info-" + key);
    if (el) el.textContent = val || "—";
  });

  // Competitions — render as chips
  renderCompetition("holy",  s.holy);
  renderCompetition("sport", s.sport);
}

function renderCompetition(id, value) {
  const el = document.getElementById("info-" + id);
  if (!el) return;

  if (!value) { el.textContent = "—"; return; }

  const items = value.split("\n").filter(v => v.trim());
  if (items.length === 0) { el.textContent = "—"; return; }

  el.innerHTML = items.map(item =>
    `<span class="badge badge-primary">${item.trim()}</span>`
  ).join("");
}

// ══════════════════════════════════════════
//  APPLY TOGGLES
// ══════════════════════════════════════════
function applyStudentToggle() {
  const canEdit = toggles.student_edit;
  const tab     = document.querySelector(".nav-item:nth-child(2)"); // competitions tab
  const notice  = document.getElementById("competitions-locked-notice");

  if (!canEdit) {
    // Make competition chips view only
    document.querySelectorAll("#info-holy .badge, #info-sport .badge")
      .forEach(el => el.style.pointerEvents = "none");
    
    // Show locked notice
    if (notice) notice.style.display = "flex";

    // Hide password tab (can't change anything)
    const navItems = document.querySelectorAll(".nav-item");
    if (navItems[2]) navItems[2].style.display = "none";

    // Replace competitions tab label
    if (tab) {
      tab.innerHTML = "🏆 مسابقاتي 🔒";
    }
  }
}

// ══════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════
function showTab(tab) {
  // Hide all tabs
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");

  // Show selected tab
  document.getElementById("tab-" + tab).classList.add("active");

  // Highlight nav item
  const navItems = document.querySelectorAll(".nav-item");
  const tabIndex = ["profile", "competitions", "password"].indexOf(tab);
  if (navItems[tabIndex]) navItems[tabIndex].classList.add("active");

  // Close sidebar on mobile
  document.getElementById("sidebar").classList.remove("open");
}

// ══════════════════════════════════════════
//  CHANGE PASSWORD
// ══════════════════════════════════════════
async function handleChangePassword() {
  const newPass     = document.getElementById("newPassword").value;
  const confirmPass = document.getElementById("confirmNewPassword").value;
  const btn         = document.getElementById("changePassBtn");

  // Validate
  let valid = true;

  if (!newPass || newPass.length < 6) {
    document.getElementById("e-newPassword").classList.add("on");
    document.getElementById("newPassword").classList.add("err");
    valid = false;
  } else {
    document.getElementById("e-newPassword").classList.remove("on");
    document.getElementById("newPassword").classList.remove("err");
  }

  if (newPass !== confirmPass) {
    document.getElementById("e-confirmNewPassword").classList.add("on");
    document.getElementById("confirmNewPassword").classList.add("err");
    valid = false;
  } else {
    document.getElementById("e-confirmNewPassword").classList.remove("on");
    document.getElementById("confirmNewPassword").classList.remove("err");
  }

  if (!valid) return;

  // Submit
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري الحفظ...';

  try {
    const res = await apiChangePassword(
      session.student.student_id,
      newPass,
      "student"
    );

    if (res.success) {
      showToast("تم تغيير كلمة المرور بنجاح ✅", "success");
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmNewPassword").value = "";
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }

  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }

  btn.disabled = false;
  btn.innerHTML = "حفظ كلمة المرور الجديدة";
}

// ══════════════════════════════════════════
//  SIDEBAR TOGGLE (mobile)
// ══════════════════════════════════════════
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ══════════════════════════════════════════
//  HELPER FUNCTIONS
// ══════════════════════════════════════════
function driveThumb(url) {
  if (!url) return "";
  const match = url.match(/\/d\/([^/]+)\//);
  if (!match) return url;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
}

// ══════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}
