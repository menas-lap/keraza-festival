// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
const session = requireRole("student");
let toggles   = {};
let options   = {};

if (session) init();

async function init() {
  try {
    const opts = await apiGetOptions();
    toggles    = opts.toggles || { student_edit: false };
    options    = opts;
  } catch (err) {
    toggles = { student_edit: false };
  }
  loadStudentData();
  applyStudentToggle();
}

// ══════════════════════════════════════════
//  LOAD STUDENT DATA
// ══════════════════════════════════════════
function loadStudentData() {
  const s = session.student;

  document.getElementById("studentName").textContent = s.full_name || "—";
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

  // Competitions — view mode
  renderCompetition("holy",  s.holy);
  renderCompetition("sport", s.sport);
}

function renderCompetition(id, value) {
  const el = document.getElementById("info-" + id);
  if (!el) return;
  if (!value) { el.textContent = "—"; return; }
  const items = value.split("\n").filter(v => v.trim());
  el.innerHTML = items.length
    ? items.map(i => `<span class="badge badge-primary">${i.trim()}</span>`).join("")
    : "—";
}

// ══════════════════════════════════════════
//  APPLY TOGGLE
// ══════════════════════════════════════════
function applyStudentToggle() {
  const canEdit = toggles.student_edit;
  const notice  = document.getElementById("competitions-locked-notice");
  const viewMode = document.getElementById("comp-view-mode");
  const editMode = document.getElementById("comp-edit-mode");

  if (canEdit) {
    // Show edit mode
    if (notice)   notice.style.display   = "none";
    if (viewMode) viewMode.style.display = "none";
    if (editMode) editMode.style.display = "block";

    // Fill edit chips with current selections
    const s = session.student;
    fillCompChips("edit-comp-holy",  options.holy  || [], s.holy);
    fillCompChips("edit-comp-sport", options.sport || [], s.sport);

  } else {
    // Show view only
    if (notice)   notice.style.display   = "block";
    if (viewMode) viewMode.style.display = "block";
    if (editMode) editMode.style.display = "none";
  }
}

function fillCompChips(groupId, allOptions, selected) {
  const el           = document.getElementById(groupId);
  if (!el) return;
  const selectedList = selected ? selected.split("\n").map(v => v.trim()) : [];

  el.innerHTML = "";
  allOptions.forEach(v => {
    const label = document.createElement("label");
    label.className = "chip";
    const checked = selectedList.includes(v) ? "checked" : "";
    label.innerHTML = `<input type="checkbox" value="${v}" ${checked}><span>${v}</span>`;
    el.appendChild(label);
  });
}

// ══════════════════════════════════════════
//  SAVE COMPETITIONS
// ══════════════════════════════════════════
async function handleSaveCompetitions() {
  const btn  = document.getElementById("saveCompBtn");
  const holy  = [...document.querySelectorAll("#edit-comp-holy input:checked")]
    .map(c => c.value).join("\n");
  const sport = [...document.querySelectorAll("#edit-comp-sport input:checked")]
    .map(c => c.value).join("\n");

  if (!holy || !sport) {
    showToast("يرجى اختيار مسابقة روحية ورياضية على الأقل", "error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري الحفظ...';

  try {
    const res = await apiUpdateStudent({
      studentId: session.student.student_id,
      holy,
      sport
    });

    if (res.success) {
      // Update session
      session.student.holy  = holy;
      session.student.sport = sport;
      saveSession(session);

      // Update view mode badges too
      renderCompetition("holy",  holy);
      renderCompetition("sport", sport);

      showToast("تم حفظ المسابقات ✅", "success");
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }

  btn.disabled = false;
  btn.innerHTML = "💾 حفظ المسابقات";
}

// ══════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════
function showTab(tab) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  const navItems = document.querySelectorAll(".nav-item");
  const tabIndex = ["profile", "competitions", "password"].indexOf(tab);
  if (navItems[tabIndex]) navItems[tabIndex].classList.add("active");
  document.getElementById("sidebar").classList.remove("open");
}

// ══════════════════════════════════════════
//  CHANGE PASSWORD
// ══════════════════════════════════════════
async function handleChangePassword() {
  const newPass     = document.getElementById("newPassword").value;
  const confirmPass = document.getElementById("confirmNewPassword").value;
  const btn         = document.getElementById("changePassBtn");

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

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري الحفظ...';

  try {
    const res = await apiChangePassword(session.student.student_id, newPass, "student");
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
//  DRIVE THUMBNAIL
// ══════════════════════════════════════════
function driveThumb(url) {
  if (!url) return "";
  const match = url.match(/\/d\/([^/]+)\//);
  if (!match) return url;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
}

// ══════════════════════════════════════════
//  SIDEBAR TOGGLE (mobile)
// ══════════════════════════════════════════
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
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
