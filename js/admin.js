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
  await loadSettings();
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

  // Load settings fresh every time tab opens
  if (tab === "settings") loadSettings();
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ══════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════
let currentSettings  = {};
let settingModalMode = null; // "add" or "edit"
let settingModalType = null; // "service" / "stage" / "gender"
let settingModalRow  = null; // row number in sheet (for edit)

async function loadSettings() {
  try {
    const res = await apiGetSettings();
    if (!res.success) throw new Error(res.reason);
    currentSettings = res.settings;
    renderSettingsTable("service");
    renderSettingsTable("stage");
    renderSettingsTable("gender");
    renderSettingsTable("holy");
    renderSettingsTable("sport");
  } catch (err) {
    showToast("خطأ في تحميل الإعدادات", "error");
  }
}

function renderSettingsTable(type) {
  const tbody = document.getElementById("settings-" + type);
  if (!tbody) return;
  const items = currentSettings[type] || [];

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="3"
        style="text-align:center;color:var(--text-secondary);padding:16px;">
        لا يوجد بيانات
      </td></tr>`;
    return;
  }

  const hasCode = (type === "service" || type === "stage" || type === "gender");
  
  tbody.innerHTML = items.map(item => `
    <tr>
      <td style="font-weight:600;">${item.name}</td>
      ${hasCode ? `
      <td>
        <span class="badge badge-gold" style="font-family:monospace;letter-spacing:2px;">
          ${item.code}
        </span>
      </td>` : `<td>-</td>`}
      <td style="display:flex;gap:6px;">
        <button class="btn btn-secondary btn-sm"
          onclick="openEditModal('${type}', ${item.row}, '${item.name}', '${item.code}')">
          ✏️ تعديل
        </button>
        <button class="btn btn-danger btn-sm"
          onclick="handleDeleteSetting(${item.row}, '${item.name}', '${type}')">
          🗑️
        </button>
      </td>
    </tr>
  `).join("");
}

// ── Open Add Modal ──
function openAddModal(type) {
  const typeNames = { service: "خدمة", stage: "مرحلة", gender: "نوع", holy: "مسابقة روحية", sport: "مسابقة رياضية" };
  const hasCode = (type === "service" || type === "stage" || type === "gender");
  
  settingModalMode = "add";
  settingModalType = type;
  settingModalRow  = null;

  document.getElementById("settingModalTitle").textContent =
    "إضافة " + typeNames[type];
  document.getElementById("setting-name").value = "";
  document.getElementById("setting-code").value = "";
  document.getElementById("e-setting-name").classList.remove("on");
  document.getElementById("e-setting-code").classList.remove("on");
  document.getElementById("settingModalBtn").textContent = "إضافة";

  // Hide code field for holy and sport
  document.getElementById("setting-code").closest(".field").style.display =
    hasCode ? "block" : "none";
  
  document.getElementById("settingModal").classList.add("open");
}

// ── Open Edit Modal ──
function openEditModal(type, row, name, code) {
  const typeNames = { service: "خدمة", stage: "مرحلة", gender: "نوع" };
  settingModalMode = "edit";
  settingModalType = type;
  settingModalRow  = row;

  document.getElementById("settingModalTitle").textContent =
    "تعديل " + typeNames[type];
  document.getElementById("setting-name").value = name;
  document.getElementById("setting-code").value = code;
  document.getElementById("e-setting-name").classList.remove("on");
  document.getElementById("e-setting-code").classList.remove("on");
  document.getElementById("settingModalBtn").textContent = "حفظ التعديل";
  document.getElementById("settingModal").classList.add("open");
}

function closeSettingModal() {
  document.getElementById("settingModal").classList.remove("open");
}

// ── Save (Add or Edit) ──
async function handleSaveSetting() {
  const name     = document.getElementById("setting-name").value.trim();
  const code     = document.getElementById("setting-code").value.trim();
  const btn      = document.getElementById("settingModalBtn");
  const hasCode  = (settingModalType === "service"  ||
                    settingModalType === "stage"    ||
                    settingModalType === "gender");

  // Validate
  let valid = true;
  if (!name) {
    document.getElementById("e-setting-name").classList.add("on"); valid = false;
  } else {
    document.getElementById("e-setting-name").classList.remove("on");
  }
  if (hasCode && !code) {
    document.getElementById("e-setting-code").classList.add("on"); valid = false;
  } else {
    document.getElementById("e-setting-code").classList.remove("on");
  }
  if (!valid) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    let res;
    if (settingModalMode === "add") {
      res = await apiAddSetting(settingModalType, name, code);
      if (res.reason === "duplicate_name") {
        showToast("الاسم ده موجود بالفعل", "error");
        btn.disabled = false;
        btn.textContent = "إضافة";
        return;
      }
    } else {
      res = await apiUpdateSetting(settingModalRow, name, code);
    }

    if (res.success) {
      showToast("تم الحفظ ✅", "success");
      closeSettingModal();
      await loadSettings();
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }

  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }

  btn.disabled = false;
  btn.textContent = settingModalMode === "add" ? "إضافة" : "حفظ التعديل";
}

// ── Delete ──
async function handleDeleteSetting(row, name, type) {
  const confirmed = window.confirm(`هل أنت متأكد من حذف "${name}"؟`);
  if (!confirmed) return;

  try {
    const res = await apiDeleteSetting(row);
    if (res.success) {
      showToast("تم الحذف ✅", "success");
      await loadSettings();
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }
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
