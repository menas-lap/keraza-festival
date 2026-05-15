// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
const session = requireRole("student");
let toggles   = {};
let options   = {};
let proofImage = null;

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

  if (tab === "payment") loadPaymentTab();
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

/*
// ══════════════════════════════════════════
//  PAYMENT TAB
// ══════════════════════════════════════════
function loadPaymentTab() {
  const s       = session.student;
  const prices  = options.prices || {};

  // Parse activities_payment
  const activities = {};
  if (s.activities_payment) {
    s.activities_payment.split("\n").filter(l => l.trim()).forEach(line => {
      const [name, status] = line.split(":");
      if (name && status) activities[name.trim()] = status.trim();
    });
  }

  // Overall status badge
  const badge       = document.getElementById("overall-status-badge");
  const statusMap   = {
    paid:    { text: "✅ مدفوع بالكامل",   bg: "#E8F5E9", color: "#2E7D32" },
    partial: { text: "⚠️ مدفوع جزئياً",   bg: "#FFF8E1", color: "#F57F17" },
    unpaid:  { text: "❌ غير مدفوع",       bg: "#FFEBEE", color: "#C62828" },
  };
  const overall     = s.payment_status || "unpaid";
  const statusStyle = statusMap[overall] || statusMap.unpaid;
  badge.textContent        = statusStyle.text;
  badge.style.background   = statusStyle.bg;
  badge.style.color        = statusStyle.color;

  // Activities breakdown + total
  const allActivities = [
    ...(s.holy  ? s.holy.split("\n").filter(v => v.trim())  : []),
    ...(s.sport ? s.sport.split("\n").filter(v => v.trim()) : [])
  ];

  let total = 0;
  let html  = "";

  allActivities.forEach(activity => {
    const price  = prices[activity.trim()] || 0;
    const status = activities[activity.trim()] || "unpaid";
    total += price;

    const isPaid     = status === "paid";
    const statusText = isPaid ? "✅ مدفوع" : "❌ غير مدفوع";
    const statusBg   = isPaid ? "#E8F5E9"  : "#FFEBEE";
    const statusClr  = isPaid ? "#2E7D32"  : "#C62828";

    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:12px 16px;border-radius:10px;margin-bottom:8px;
        background:var(--cream);border:1px solid var(--border-light);">
        <div style="font-weight:600;">${activity.trim()}</div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-weight:700;color:var(--primary);">${price} جنيه</div>
          <div style="padding:4px 12px;border-radius:12px;font-size:0.82rem;
            font-weight:700;background:${statusBg};color:${statusClr};">
            ${statusText}
          </div>
        </div>
      </div>`;
  });

  document.getElementById("activities-breakdown").innerHTML = html;
  document.getElementById("total-amount").textContent = total + " جنيه";

  // Payment proof
  const isLocked = s.payment_proof_locked === true ||
                   s.payment_proof_locked === "true" ||
                   s.payment_proof_locked === "TRUE";

  if (s.payment_proof) {
    document.getElementById("proof-existing").style.display = "block";
    document.getElementById("proof-img").src = driveThumb(s.payment_proof);
  }

  const zoneEl    = document.getElementById("zone-proof");
  const fileInput = document.getElementById("proof-file-input");
  const notice    = document.getElementById("proof-locked-notice");

  if (isLocked) {
    // Disable upload
    zoneEl.style.opacity      = "0.5";
    zoneEl.style.pointerEvents = "none";
    fileInput.disabled         = true;
    notice.style.display       = "block";
  } else {
    zoneEl.style.opacity       = "1";
    zoneEl.style.pointerEvents = "auto";
    fileInput.disabled         = false;
    notice.style.display       = "none";
  }
}

function handleProofFile(input) {
  const file = input.files[0];
  if (!file) return;
  compressImage(file).then(base64 => {
    proofImage = base64;
    document.getElementById("img-proof").src  = base64;
    document.getElementById("prev-proof").classList.add("on");
    document.getElementById("zone-proof").style.display  = "none";
    document.getElementById("uploadProofBtn").style.display = "block";
  });
}

function replaceProof() {
  proofImage = null;
  document.getElementById("img-proof").src = "";
  document.getElementById("prev-proof").classList.remove("on");
  document.getElementById("zone-proof").style.display = "";
  document.getElementById("proof-file-input").value   = "";
  document.getElementById("uploadProofBtn").style.display = "none";
}

async function handleUploadProof() {
  if (!proofImage) return;

  const btn = document.getElementById("uploadProofBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري الرفع...';

  try {
    const res = await apiUpdatePaymentProof(
      session.student.student_id,
      proofImage,
      "student"
    );

    if (res.success) {
      // Update session
      session.student.payment_proof        = res.url;
      session.student.payment_proof_locked = true;
      saveSession(session);

      showToast("تم رفع إثبات الدفع بنجاح ✅", "success");

      // Refresh payment tab
      loadPaymentTab();
      replaceProof();

    } else if (res.reason === "locked") {
      showToast("🔒 إثبات الدفع مقفول، تواصل مع خادمك", "error");
    } else {
      showToast("حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال", "error");
  }

  btn.disabled = false;
  btn.innerHTML = "رفع إثبات الدفع";
}
*/

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
