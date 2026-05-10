// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
const session = requireRole("admin");
let allStudents    = [];
let allServants    = [];
let currentStudent = null;
let options        = {};

if (session) init();

async function init() {
  document.getElementById("adminName").textContent = session.name;

  // Load options for filters + edit dropdowns
  try {
    options = await apiGetOptions();
    fillFilterDropdowns();
    fillEditDropdowns();
    fillServantModal();
  } catch (err) {
    showToast("خطأ في تحميل الخيارات", "error");
  }

  await loadStudents();
  await loadServants();
}

// ══════════════════════════════════════════
//  FILL DROPDOWNS
// ══════════════════════════════════════════
function fillFilterDropdowns() {
  fillSelect("filterService", options.service);
  fillSelect("filterStage",   options.stage);
}

function fillEditDropdowns() {
  fillSelectEl(document.getElementById("edit-stage"),   options.stage);
  fillSelectEl(document.getElementById("edit-service"), options.service);
  fillSelectEl(document.getElementById("edit-gender"),  options.gender);
  fillChips("edit-holy",  options.holy);
  fillChips("edit-sport", options.sport);
}

function fillServantModal() {
  fillSelectEl(document.getElementById("sv-service"), options.service);
  fillChips("sv-stages", options.stage);
}

function fillSelect(id, values) {
  const el = document.getElementById(id);
  values.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    el.appendChild(o);
  });
}

function fillSelectEl(el, values) {
  values.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    el.appendChild(o);
  });
}

function fillChips(groupId, values) {
  const el = document.getElementById(groupId);
  el.innerHTML = "";
  values.forEach(v => {
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = `<input type="checkbox" value="${v}"><span>${v}</span>`;
    el.appendChild(label);
  });
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
    renderStudentsTable(allStudents);
  } catch (err) {
    document.getElementById("studentsTableBody").innerHTML =
      `<tr><td colspan="7" style="text-align:center;color:var(--error);padding:20px;">
        خطأ في تحميل البيانات
      </td></tr>`;
  }
}

// ══════════════════════════════════════════
//  LOAD SERVANTS
// ══════════════════════════════════════════
async function loadServants() {
  try {
    const res = await apiGetServants();
    if (!res.success) throw new Error(res.reason);
    allServants = res.servants;
    renderServantsTable(allServants);
  } catch (err) {
    document.getElementById("servantsTableBody").innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:var(--error);padding:20px;">
        خطأ في تحميل البيانات
      </td></tr>`;
  }
}

// ══════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════
function renderStats() {
  const services = [...new Set(allStudents.map(s => s.service))];
  const grid     = document.getElementById("statsGrid");

  let html = `
    <div class="stat-card">
      <div class="stat-number">${allStudents.length}</div>
      <div class="stat-label">إجمالي المخدومين</div>
    </div>`;

  services.forEach(service => {
    const count = allStudents.filter(s => s.service === service).length;
    html += `
      <div class="stat-card">
        <div class="stat-number">${count}</div>
        <div class="stat-label">${service}</div>
      </div>`;
  });

  grid.innerHTML = html;
}

// ══════════════════════════════════════════
//  RENDER TABLES
// ══════════════════════════════════════════
function renderStudentsTable(students) {
  const tbody = document.getElementById("studentsTableBody");

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:30px;">
        لا يوجد مخدومين
      </td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><span class="badge badge-primary">${s.student_id}</span></td>
      <td style="font-weight:600;">${s.full_name}</td>
      <td><span class="badge badge-gold">${s.service}</span></td>
      <td>${s.stage}</td>
      <td>${s.gender}</td>
      <td dir="ltr" style="text-align:right;">${s.parent_phone}</td>
      <td>
        <button class="btn btn-secondary btn-sm"
          onclick="openStudentModal('${s.student_id}')">
          تعديل
        </button>
      </td>
    </tr>
  `).join("");
}

function renderServantsTable(servants) {
  const tbody = document.getElementById("servantsTableBody");

  if (servants.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:30px;">
        لا يوجد خدام
      </td></tr>`;
    return;
  }

  tbody.innerHTML = servants.map(s => `
    <tr>
      <td><span class="badge badge-primary">${s.servant_id}</span></td>
      <td style="font-weight:600;">${s.name}</td>
      <td><span class="badge badge-gold">${s.service}</span></td>
      <td>${(s.stages || "").replace(/\n/g, " / ")}</td>
      <td>
        <button class="btn btn-danger btn-sm"
          onclick="handleDeleteServant('${s.servant_id}', '${s.name}')">
          🗑️ حذف
        </button>
      </td>
    </tr>
  `).join("");
}

// ══════════════════════════════════════════
//  FILTER STUDENTS
// ══════════════════════════════════════════
function filterStudents() {
  const search  = document.getElementById("searchInput").value.trim().toLowerCase();
  const service = document.getElementById("filterService").value;
  const stage   = document.getElementById("filterStage").value;
  const gender  = document.getElementById("filterGender").value;

  const filtered = allStudents.filter(s => {
    const matchSearch = !search ||
      s.full_name.toLowerCase().includes(search) ||
      String(s.national_id).includes(search) ||
      s.student_id.toLowerCase().includes(search);
    const matchService = !service || s.service === service;
    const matchStage   = !stage   || s.stage   === stage;
    const matchGender  = !gender  || s.gender  === gender;
    return matchSearch && matchService && matchStage && matchGender;
  });

  renderStudentsTable(filtered);
}

// ══════════════════════════════════════════
//  STUDENT MODAL — OPEN
// ══════════════════════════════════════════
function openStudentModal(studentId) {
  const s = allStudents.find(st => st.student_id === studentId);
  if (!s) return;
  currentStudent = s;

  document.getElementById("modalStudentName").textContent = s.full_name;

  // Photos
  const photo = document.getElementById("modal-photo");
  const birth = document.getElementById("modal-birth");
  if (s.personal_photo) { photo.src = s.personal_photo; photo.style.display = "block"; }
  else photo.style.display = "none";
  if (s.birth_cert) { birth.src = s.birth_cert; birth.style.display = "block"; }
  else birth.style.display = "none";

  // Fill editable fields
  document.getElementById("edit-fullName").value    = s.full_name    || "";
  document.getElementById("edit-stage").value       = s.stage        || "";
  document.getElementById("edit-service").value     = s.service      || "";
  document.getElementById("edit-gender").value      = s.gender       || "";
  document.getElementById("edit-birthDate").value   = s.birth_date   || "";
  document.getElementById("edit-family").value      = s.family       || "";
  document.getElementById("edit-parentPhone").value = s.parent_phone || "";
  document.getElementById("edit-studentPhone").value= s.student_phone|| "";
  document.getElementById("edit-nationalId").value  = s.national_id  || "";

  // Competitions checkboxes
  setCheckedChips("edit-holy",  s.holy);
  setCheckedChips("edit-sport", s.sport);

  // Clear password
  document.getElementById("modal-newPassword").value = "";

  document.getElementById("studentModal").classList.add("open");
}

function setCheckedChips(groupId, value) {
  const checks = document.querySelectorAll(`#${groupId} input[type="checkbox"]`);
  const selected = value ? value.split("\n").map(v => v.trim()) : [];
  checks.forEach(c => { c.checked = selected.includes(c.value); });
}

function closeStudentModal() {
  document.getElementById("studentModal").classList.remove("open");
  currentStudent = null;
}

// ══════════════════════════════════════════
//  SAVE STUDENT EDITS
// ══════════════════════════════════════════
async function handleSaveStudent() {
  if (!currentStudent) return;

  const btn = document.getElementById("saveEditBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري الحفظ...';

  const holy  = [...document.querySelectorAll("#edit-holy input:checked")].map(c => c.value).join("\n");
  const sport = [...document.querySelectorAll("#edit-sport input:checked")].map(c => c.value).join("\n");

  const payload = {
    studentId:    currentStudent.student_id,
    full_name:    document.getElementById("edit-fullName").value.trim(),
    stage:        document.getElementById("edit-stage").value,
    service:      document.getElementById("edit-service").value,
    gender:       document.getElementById("edit-gender").value,
    birth_date:   document.getElementById("edit-birthDate").value,
    family:       document.getElementById("edit-family").value.trim(),
    parent_phone: document.getElementById("edit-parentPhone").value.trim(),
    student_phone:document.getElementById("edit-studentPhone").value.trim(),
    national_id:  document.getElementById("edit-nationalId").value.trim(),
    holy,
    sport,
  };

  try {
    const res = await apiUpdateStudent(payload);
    if (res.success) {
      showToast("تم حفظ التعديلات ✅", "success");
      await loadStudents();
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }

  btn.disabled = false;
  btn.innerHTML = "💾 حفظ التعديلات";
}

// ══════════════════════════════════════════
//  CHANGE PASSWORD
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
  const confirmed = window.confirm(
    `هل أنت متأكد من حذف حساب ${currentStudent.full_name}؟\nهذا الإجراء لا يمكن التراجع عنه.`
  );
  if (!confirmed) return;

  try {
    const res = await apiDeleteStudent(currentStudent.student_id);
    if (res.success) {
      showToast("تم حذف الحساب ✅", "success");
      closeStudentModal();
      await loadStudents();
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }
}

// ══════════════════════════════════════════
//  ADD SERVANT MODAL
// ══════════════════════════════════════════
function openAddServantModal() {
  document.getElementById("sv-name").value     = "";
  document.getElementById("sv-password").value = "";
  document.getElementById("sv-service").value  = "";
  document.querySelectorAll("#sv-stages input").forEach(c => c.checked = false);
  ["sv-name","sv-password","sv-service","sv-stages"].forEach(id => {
    document.getElementById("e-" + id)?.classList.remove("on");
  });
  document.getElementById("servantModal").classList.add("open");
}

function closeServantModal() {
  document.getElementById("servantModal").classList.remove("open");
}

async function handleAddServant() {
  const name     = document.getElementById("sv-name").value.trim();
  const password = document.getElementById("sv-password").value.trim();
  const service  = document.getElementById("sv-service").value;
  const stages   = [...document.querySelectorAll("#sv-stages input:checked")]
                    .map(c => c.value).join("\n");

  // Validate
  let valid = true;
  const fail = (id) => { document.getElementById("e-" + id).classList.add("on"); valid = false; };
  const pass = (id) => { document.getElementById("e-" + id).classList.remove("on"); };

  if (!name)             fail("sv-name");     else pass("sv-name");
  if (!password || password.length < 6) fail("sv-password"); else pass("sv-password");
  if (!service)          fail("sv-service");  else pass("sv-service");
  if (!stages)           fail("sv-stages");   else pass("sv-stages");

  if (!valid) return;

  const btn = document.getElementById("addServantBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const res = await apiCreateServant({ name, password, service, stages });
    if (res.success) {
      showToast(`تم إضافة الخادم بنجاح — ${res.id} ✅`, "success");
      closeServantModal();
      await loadServants();
    } else if (res.reason === "duplicate_name") {
      showToast("يوجد خادم بنفس الاسم", "error");
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }

  btn.disabled = false;
  btn.innerHTML = "إضافة الخادم";
}

// ══════════════════════════════════════════
//  DELETE SERVANT
// ══════════════════════════════════════════
async function handleDeleteServant(servantId, name) {
  const confirmed = window.confirm(
    `هل أنت متأكد من حذف حساب الخادم ${name}؟`
  );
  if (!confirmed) return;

  try {
    const res = await apiDeleteServant(servantId);
    if (res.success) {
      showToast("تم حذف الخادم ✅", "success");
      await loadServants();
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
function showTab(tab, btn) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  btn.classList.add("active");
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
