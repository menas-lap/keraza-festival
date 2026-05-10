// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
const session = requireRole("servant");
let allStudents    = [];
let currentStudent = null;

if (session) init();

async function init() {
  // Sidebar info
  document.getElementById("servantName").textContent = session.name;
  document.getElementById("servantInfo").textContent =
    session.service + " — " + session.stages.replace(/\n/g, " / ");

  // Fill stage filter from servant's stages
  const stageFilter = document.getElementById("filterStage");
  session.stages.split("\n").filter(s => s.trim()).forEach(stage => {
    const o = document.createElement("option");
    o.value = stage.trim();
    o.textContent = stage.trim();
    stageFilter.appendChild(o);
  });

  await loadStudents();
}

// ══════════════════════════════════════════
//  LOAD STUDENTS
// ══════════════════════════════════════════
async function loadStudents() {
  try {
    const res = await apiGetStudents();
    if (!res.success) throw new Error(res.reason);

    allStudents = res.students;
    renderStats();
    renderTable(allStudents);

  } catch (err) {
    document.getElementById("studentsTableBody").innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:var(--error);padding:20px;">
        خطأ في تحميل البيانات
      </td></tr>`;
  }
}

// ══════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════
function renderStats() {
  const stages = [...new Set(allStudents.map(s => s.stage))];
  const grid   = document.getElementById("statsGrid");

  // Total card
  let html = `
    <div class="stat-card">
      <div class="stat-number">${allStudents.length}</div>
      <div class="stat-label">إجمالي المخدومين</div>
    </div>`;

  // Per stage
  stages.forEach(stage => {
    const count = allStudents.filter(s => s.stage === stage).length;
    html += `
      <div class="stat-card">
        <div class="stat-number">${count}</div>
        <div class="stat-label">${stage}</div>
      </div>`;
  });

  grid.innerHTML = html;
}

// ══════════════════════════════════════════
//  RENDER TABLE
// ══════════════════════════════════════════
function renderTable(students) {
  const tbody = document.getElementById("studentsTableBody");

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:30px;">
        لا يوجد مخدومين
      </td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><span class="badge badge-primary">${s.student_id}</span></td>
      <td style="font-weight:600;">${s.full_name}</td>
      <td><span class="badge badge-gold">${s.stage}</span></td>
      <td>${s.gender}</td>
      <td dir="ltr" style="text-align:right;">${s.parent_phone}</td>
      <td>
        <button class="btn btn-secondary btn-sm"
          onclick="openStudentModal('${s.student_id}')">
          عرض التفاصيل
        </button>
      </td>
    </tr>
  `).join("");
}

// ══════════════════════════════════════════
//  FILTER
// ══════════════════════════════════════════
function filterStudents() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const stage  = document.getElementById("filterStage").value;

  const filtered = allStudents.filter(s => {
    const matchSearch = !search ||
      s.full_name.toLowerCase().includes(search) ||
      String(s.national_id).includes(search);
    const matchStage = !stage || s.stage === stage;
    return matchSearch && matchStage;
  });

  renderTable(filtered);
}

// ══════════════════════════════════════════
//  STUDENT DETAIL MODAL
// ══════════════════════════════════════════
function openStudentModal(studentId) {
  const s = allStudents.find(st => st.student_id === studentId);
  if (!s) return;
  currentStudent = s;

  // Header
  document.getElementById("modalStudentName").textContent = s.full_name;

  // Photos
  const photo = document.getElementById("modal-photo");
  const birth = document.getElementById("modal-birth");
  if (s.personal_photo) { photo.src = s.personal_photo; photo.style.display = "block"; }
  else photo.style.display = "none";
  if (s.birth_cert) { birth.src = s.birth_cert; birth.style.display = "block"; }
  else birth.style.display = "none";

  // Info
  document.getElementById("m-id").textContent          = s.student_id      || "—";
  document.getElementById("m-name").textContent         = s.full_name       || "—";
  document.getElementById("m-stage").textContent        = s.stage           || "—";
  document.getElementById("m-service").textContent      = s.service         || "—";
  document.getElementById("m-gender").textContent       = s.gender          || "—";
  document.getElementById("m-birth").textContent        = s.birth_date      || "—";
  document.getElementById("m-family").textContent       = s.family          || "—";
  document.getElementById("m-parentPhone").textContent  = s.parent_phone    || "—";
  document.getElementById("m-studentPhone").textContent = s.student_phone   || "—";
  document.getElementById("m-nid").textContent          = s.national_id     || "—";

  // Competitions
  renderBadges("m-holy",  s.holy);
  renderBadges("m-sport", s.sport);

  // Clear password field
  document.getElementById("modal-newPassword").value = "";

  document.getElementById("detailModal").classList.add("open");
}

function renderBadges(id, value) {
  const el = document.getElementById(id);
  if (!value) { el.textContent = "—"; return; }
  const items = value.split("\n").filter(v => v.trim());
  el.innerHTML = items.length
    ? items.map(i => `<span class="badge badge-primary">${i.trim()}</span>`).join("")
    : "—";
}

function closeModal() {
  document.getElementById("detailModal").classList.remove("open");
  currentStudent = null;
}

// ══════════════════════════════════════════
//  CHANGE PASSWORD (from modal)
// ══════════════════════════════════════════
async function handleModalChangePassword() {
  const newPass = document.getElementById("modal-newPassword").value.trim();
  if (!newPass || newPass.length < 6) {
    showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error");
    return;
  }

  try {
    const res = await apiChangePassword(currentStudent.student_id, newPass, "student");
    if (res.success) {
      showToast("تم تغيير كلمة المرور ✅", "success");
      document.getElementById("modal-newPassword").value = "";
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }
}

// ══════════════════════════════════════════
//  DELETE STUDENT
// ══════════════════════════════════════════
async function handleDeleteStudent() {
  if (!currentStudent) return;

  const confirm = window.confirm(
    `هل أنت متأكد من حذف حساب ${currentStudent.full_name}؟\nهذا الإجراء لا يمكن التراجع عنه.`
  );
  if (!confirm) return;

  try {
    const res = await apiDeleteStudent(currentStudent.student_id);
    if (res.success) {
      showToast("تم حذف الحساب ✅", "success");
      closeModal();
      await loadStudents();
    } else if (res.reason === "unauthorized") {
      showToast("ليس لديك صلاحية حذف هذا الطالب", "error");
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }
}

// ══════════════════════════════════════════
//  TABS & SIDEBAR
// ══════════════════════════════════════════
function showTab(tab) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  event.currentTarget.classList.add("active");
  document.getElementById("sidebar").classList.remove("open");
}

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
