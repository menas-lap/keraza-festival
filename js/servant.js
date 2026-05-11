// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
const session = requireRole("servant");
let allStudents    = [];
let currentStudent = null;
let toggles = {};

if (session) init();

async function init() {
  // Sidebar info
  document.getElementById("servantName").textContent = session.name;
  document.getElementById("servantInfo").textContent =
    session.service + " — " + session.stages.replace(/\n/g, " / ");

  // Load toggles + options
  try {
    const opts     = await apiGetOptions();
    toggles        = opts.toggles || { servant_edit: false };
    servantOptions = opts;
  } catch (err) {
    toggles = { servant_edit: false };
  }

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
//  SAVE STUDENT EDITS
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
  if (s.personal_photo) { 
    photo.src = driveThumb(s.personal_photo);
    photo.style.display = "block";
  }
  else photo.style.display = "none";
  if (s.birth_cert) {
    birth.src = driveThumb(s.birth_cert);
    birth.style.display = "block";
  }
  else birth.style.display = "none";

  // Info
  document.getElementById("m-id").textContent           = s.student_id      || "—";
  document.getElementById("m-name").textContent         = s.full_name       || "—";
  document.getElementById("m-stage").textContent        = s.stage           || "—";
  document.getElementById("m-service").textContent      = s.service         || "—";
  document.getElementById("m-gender").textContent       = s.gender          || "—";
  document.getElementById("m-birth").textContent        = normalizeDateForInput(s.birth_date);
  document.getElementById("m-family").textContent       = s.family          || "—";
  document.getElementById("m-parentPhone").textContent  = s.parent_phone    || "—";
  document.getElementById("m-studentPhone").textContent = s.student_phone   || "—";
  document.getElementById("m-nid").textContent          = s.national_id     || "—";

  // Apply servant toggle
  const canEdit          = toggles.servant_edit;
  const compEdit         = document.getElementById("modal-comp-edit");
  const compView         = document.getElementById("modal-comp-view");
  const compLocked       = document.getElementById("modal-comp-locked");
  const holyView         = document.getElementById("m-holy-view");
  const sportView        = document.getElementById("m-sport-view");

  if (canEdit) {
    if (compLocked)  compLocked.style.display  = "none";
    if (compView)    compView.style.display    = "none";
    if (compEdit)    compEdit.style.display    = "block";

    // Fill checkboxes with current selections
    fillModalChips("m-holy",  servantOptions.holy  || [], s.holy);
    fillModalChips("m-sport", servantOptions.sport || [], s.sport);
    
  } else {
    if (compLocked)  compLocked.style.display  = "block";
    if (compView)    compView.style.display  = "block";
    if (compEdit)    compEdit.style.display  = "none";

    // Competitions
    renderBadges("m-holy",  s.holy);
    renderBadges("m-sport", s.sport);
  }

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

function renderCompetition(id, value) {
  const el = document.getElementById("info-" + id);
  if (!el) return;
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
//  ADD STUDENT MODAL
// ══════════════════════════════════════════
const addImages = { photo: null, birth: null };

async function openAddStudentModal() {
  // Reset fields
  ["fullName","nationalId","family","parentPhone",
   "studentPhone","password","confirmPassword"].forEach(id => {
    document.getElementById("add-" + id).value = "";
  });
  ["add-stage","add-gender","add-nationalIdOwner"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.querySelectorAll("#add-holy input, #add-sport input")
    .forEach(c => c.checked = false);
  addImages.photo = null;
  addImages.birth = null;
  replaceAddImage("photo");
  replaceAddImage("birth");
  document.querySelectorAll("[id^='e-add-']").forEach(el => el.classList.remove("on"));

  // Lock service to servant's service
  document.getElementById("add-service").value          = session.service;
  document.getElementById("add-service-display").value  = session.service;

  // Fill stage — only servant's stages
  const stageEl = document.getElementById("add-stage");
  stageEl.innerHTML = '<option value="">— اختر —</option>';
  const stageList = session.stages.split("\n").filter(s => s.trim());
  stageList.forEach(v => {
    stageEl.innerHTML += `<option value="${v}">${v}</option>`;
  });

  // Watch stage for kindergarten
  stageEl.onchange = () => {
    const isKG = stageEl.value === "حضانة";
    document.getElementById("add-ownerField").style.display = isKG ? "block" : "none";
  };

  // Fill gender + competitions from API
  try {
    const opts = await apiGetOptions();
    const genderEl = document.getElementById("add-gender");
    genderEl.innerHTML = '<option value="">— اختر —</option>';
    opts.gender.forEach(v => genderEl.innerHTML += `<option value="${v}">${v}</option>`);
    fillAddChips("add-holy",  opts.holy);
    fillAddChips("add-sport", opts.sport);
  } catch (err) {
    showToast("خطأ في تحميل البيانات", "error");
    return;
  }

  document.getElementById("addStudentModal").classList.add("open");
}

function fillAddChips(groupId, values) {
  const el = document.getElementById(groupId);
  el.innerHTML = "";
  values.forEach(v => {
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = `<input type="checkbox" value="${v}"><span>${v}</span>`;
    el.appendChild(label);
  });
}

function closeAddStudentModal() {
  document.getElementById("addStudentModal").classList.remove("open");
}

function handleAddFile(input, type) {
  const file = input.files[0];
  if (!file) return;
  compressAddImage(file).then(base64 => {
    addImages[type] = base64;
    document.getElementById("add-img-"  + type).src = base64;
    document.getElementById("add-prev-" + type).classList.add("on");
    document.getElementById("add-zone-" + type).style.display = "none";
    document.getElementById("e-add-"    + type).classList.remove("on");
  });
}

function replaceAddImage(type) {
  addImages[type] = null;
  document.getElementById("add-img-"  + type).src = "";
  document.getElementById("add-prev-" + type).classList.remove("on");
  const zone = document.getElementById("add-zone-" + type);
  zone.style.display = "";
  zone.querySelector("input[type='file']").value = "";
}

function compressAddImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleAddStudent() {
  const stage    = document.getElementById("add-stage").value;
  const isKG     = stage === "حضانة";
  const phoneReg = /^01[0-9]{9}$/;
  let valid      = true;

  const fail = (id, msg) => {
    const err = document.getElementById("e-add-" + id);
    if (msg) err.textContent = msg;
    err.classList.add("on"); valid = false;
  };
  const pass = id => document.getElementById("e-add-" + id).classList.remove("on");

  // Name
  const name  = document.getElementById("add-fullName").value.trim();
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (!name)             fail("fullName", "هذا الحقل مطلوب");
  else if (words.length < 4) fail("fullName", "يرجى كتابة الاسم الرباعي (٤ أسماء)");
  else pass("fullName");

  // Stage
  if (!stage) fail("stage", "هذا الحقل مطلوب"); else pass("stage");

  // Gender
  if (!document.getElementById("add-gender").value) fail("gender", "هذا الحقل مطلوب");
  else pass("gender");

  // Birth date
  const birthVal = document.getElementById("add-birthDate").value;
  if (!birthVal) fail("birthDate", "هذا الحقل مطلوب");
  else {
    const age = new Date().getFullYear() - new Date(birthVal).getFullYear();
    if (age < 2 || age > 18) fail("birthDate", "العمر يجب أن يكون بين ٢ و ١٨ سنة");
    else pass("birthDate");
  }

  // National ID
  const nid = document.getElementById("add-nationalId").value.trim();
  if (!/^\d{14}$/.test(nid)) fail("nationalId", "رقم قومي غير صحيح (14 رقم)");
  else pass("nationalId");

  // ID owner (KG only)
  if (isKG && !document.getElementById("add-nationalIdOwner").value)
    fail("nationalIdOwner", "هذا الحقل مطلوب");
  else pass("nationalIdOwner");

  // Parent phone
  const parentPhone = document.getElementById("add-parentPhone").value.trim();
  if (!parentPhone)                     fail("parentPhone", "هذا الحقل مطلوب");
  else if (!phoneReg.test(parentPhone)) fail("parentPhone", "رقم غير صحيح");
  else pass("parentPhone");

  // Student phone (optional)
  const studentPhone = document.getElementById("add-studentPhone").value.trim();
  if (studentPhone && !phoneReg.test(studentPhone)) fail("studentPhone", "رقم غير صحيح");
  else pass("studentPhone");

  // Password
  const pass1 = document.getElementById("add-password").value;
  const pass2 = document.getElementById("add-confirmPassword").value;
  if (!pass1 || pass1.length < 6) fail("password", "6 أحرف على الأقل");
  else pass("password");
  if (pass1 !== pass2) fail("confirmPassword", "كلمتا المرور غير متطابقتين");
  else pass("confirmPassword");

  // Images
  ["photo", "birth"].forEach(type => {
    if (!addImages[type]) {
      document.getElementById("e-add-" + type).classList.add("on"); valid = false;
    } else {
      document.getElementById("e-add-" + type).classList.remove("on");
    }
  });

  // Competitions
  ["holy", "sport"].forEach(id => {
    const checked = document.querySelectorAll(`#add-${id} input:checked`).length > 0;
    document.getElementById("e-add-" + id).classList.toggle("on", !checked);
    if (!checked) valid = false;
  });

  if (!valid) {
    document.querySelector("#addStudentModal .ferr.on")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const btn = document.getElementById("addStudentBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري الإضافة...';

  const payload = {
    fullName:        name,
    stage,
    service:         session.service,
    gender:          document.getElementById("add-gender").value,
    birthDate:       document.getElementById("add-birthDate").value,
    family:          document.getElementById("add-family").value.trim(),
    nationalId:      nid,
    nationalIdOwner: isKG
      ? document.getElementById("add-nationalIdOwner").value
      : "self",
    parentPhone,
    studentPhone,
    photo:           addImages.photo,
    birthCert:       addImages.birth,
    holy:  [...document.querySelectorAll("#add-holy input:checked")].map(c => c.value).join("\n"),
    sport: [...document.querySelectorAll("#add-sport input:checked")].map(c => c.value).join("\n"),
    password: pass1,
  };

  try {
    const res = await apiRegister(payload);
    if (res.success) {
      showToast(`تم إضافة الطالب بنجاح — ${res.id} ✅`, "success");
      closeAddStudentModal();
      await loadStudents();
    } else if (res.reason === "duplicate_id") {
      showToast("الرقم القومي ده مسجل من قبل", "error");
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }

  btn.disabled = false;
  btn.innerHTML = "إضافة الطالب ☩";
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
//  HELPER FUNCTIONS
// ══════════════════════════════════════════
function driveThumb(url) {
  if (!url) return "";
  const match = url.match(/\/d\/([^/]+)\//);
  if (!match) return url;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
}

function fillModalChips(groupId, allOptions, selected) {
  const el           = document.getElementById(groupId);
  if (!el) return;
  const selectedList = selected ? selected.split("\n").map(v => v.trim()) : [];
  el.innerHTML = "";
  allOptions.forEach(v => {
    const label = document.createElement("label");
    label.className = "chip";
    const checked   = selectedList.includes(v) ? "checked" : "";
    label.innerHTML = `<input type="checkbox" value="${v}" ${checked}><span>${v}</span>`;
    el.appendChild(label);
  });

function normalizeDateForInput(value) {
  if (!value) return "";

  // already correct
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) return "";

  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
