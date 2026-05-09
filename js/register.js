// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
const images = { photo: null, birth: null };

// ══════════════════════════════════════════
//  INIT — load options from Google Sheet
// ══════════════════════════════════════════
(async function init() {
  // If already logged in → redirect
  const session = getSession();
  if (session) { redirectByRole(session.role); return; }

  try {
    const opts = await apiGetOptions();

    fillSelect("stage",   opts.stage);
    fillSelect("service", opts.service);
    fillSelect("gender",  opts.gender);
    fillChips("holy",  opts.holy);
    fillChips("sport", opts.sport);

    // Watch stage change → show/hide kindergarten notice
    document.getElementById("stage").addEventListener("change", handleStageChange);

  } catch (err) {
    showToast("خطأ في تحميل البيانات، يرجى تحديث الصفحة", "error");
  }
})();

// ══════════════════════════════════════════
//  FILL HELPERS
// ══════════════════════════════════════════
function fillSelect(id, values) {
  const el = document.getElementById(id);
  values.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    el.appendChild(o);
  });
}

function fillChips(groupId, values) {
  const el = document.getElementById(groupId);
  values.forEach(v => {
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = `<input type="checkbox" value="${v}"><span>${v}</span>`;
    el.appendChild(label);
  });
}

// ══════════════════════════════════════════
//  STAGE CHANGE → kindergarten logic
// ══════════════════════════════════════════
function handleStageChange() {
  const stage      = document.getElementById("stage").value;
  const notice     = document.getElementById("kindergartenNotice");
  const ownerField = document.getElementById("ownerField");

  if (stage === "حضانة") {
    notice.classList.add("on");
    ownerField.style.display = "block";
  } else {
    notice.classList.remove("on");
    ownerField.style.display = "none";
    // clear radio selection
    document.querySelectorAll("input[name='idOwner']").forEach(r => r.checked = false);
  }
}

// ══════════════════════════════════════════
//  IMAGE HANDLING
// ══════════════════════════════════════════
function handleFile(input, type) {
  const file = input.files[0];
  if (!file) return;
  compressImage(file).then(base64 => {
    images[type] = base64;
    document.getElementById("img-"  + type).src = base64;
    document.getElementById("prev-" + type).classList.add("on");
    document.getElementById("zone-" + type).style.display = "none";
    document.getElementById("e-"    + type).classList.remove("on");
  });
}

function replaceImage(type) {
  images[type] = null;
  document.getElementById("img-"  + type).src = "";
  document.getElementById("prev-" + type).classList.remove("on");
  const zone = document.getElementById("zone-" + type);
  zone.style.display = "";
  zone.querySelector("input[type='file']").value = "";
}

function compressImage(file, maxWidth = 1200, quality = 0.75) {
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

// ══════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════
function showErr(id, msg, hasErr) {
  const el  = document.getElementById(id);
  const err = document.getElementById("e-" + id);
  if (el)  el.classList.toggle("err", hasErr);
  if (err) {
    if (msg) err.textContent = msg;
    err.classList.toggle("on", hasErr);
  }
}

function validate() {
  let valid = true;
  const fail = (id, msg) => { showErr(id, msg, true); valid = false; };
  const pass = (id)      => showErr(id, "", false);

  // Name — 4 words
  const name  = document.getElementById("fullName").value.trim();
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (!name)          fail("fullName", "هذا الحقل مطلوب");
  else if (words.length < 4) fail("fullName", "يرجى كتابة الاسم الرباعي كاملاً (٤ أسماء على الأقل)");
  else                pass("fullName");

  // Selects
  ["stage", "service", "gender"].forEach(id => {
    if (!document.getElementById(id).value) fail(id, "هذا الحقل مطلوب");
    else pass(id);
  });

  // Birth date (age 2–18)
  const birthVal = document.getElementById("birthDate").value;
  if (!birthVal) {
    fail("birthDate", "هذا الحقل مطلوب");
  } else {
    const age = new Date().getFullYear() - new Date(birthVal).getFullYear();
    if (age < 2 || age > 18) fail("birthDate", "تاريخ الميلاد يجب أن يكون بين ٢ و ١٨ سنة");
    else pass("birthDate");
  }

  // National ID — 14 digits
  const nid = document.getElementById("nationalId").value.trim();
  if (!/^\d{14}$/.test(nid)) fail("nationalId", "يرجى إدخال رقم قومي صحيح (14 رقم)");
  else pass("nationalId");

  // ID owner — required only for kindergarten
  const stage = document.getElementById("stage").value;
  if (stage === "حضانة") {
    const owner = document.querySelector("input[name='idOwner']:checked");
    if (!owner) fail("idOwner", "يرجى تحديد الرقم القومي بتاع الأب أو الأم");
    else        pass("idOwner");
  }

  // Phone — parent required
  const phoneRegex = /^01[0-9]{9}$/;
  const parentPhone = document.getElementById("parentPhone").value.trim();
  if (!parentPhone)               fail("parentPhone", "هذا الحقل مطلوب");
  else if (!phoneRegex.test(parentPhone)) fail("parentPhone", "رقم التليفون يجب أن يكون ١١ رقم ويبدأ بـ 01");
  else pass("parentPhone");

  // Student phone — optional
  const studentPhone = document.getElementById("studentPhone").value.trim();
  if (studentPhone && !phoneRegex.test(studentPhone)) fail("studentPhone", "رقم التليفون يجب أن يكون ١١ رقم ويبدأ بـ 01");
  else pass("studentPhone");

  // Images
  ["photo", "birth"].forEach(type => {
    const err = document.getElementById("e-" + type);
    if (!images[type]) { err.classList.add("on"); valid = false; }
    else err.classList.remove("on");
  });

  // Checkboxes
  ["holy", "sport"].forEach(id => {
    const checked = document.querySelectorAll(`#${id} input:checked`).length > 0;
    const err     = document.getElementById("e-" + id);
    const group   = document.getElementById(id);
    group.classList.toggle("err", !checked);
    err.classList.toggle("on", !checked);
    if (!checked) valid = false;
  });

  // Password
  const pass1 = document.getElementById("password").value;
  const pass2 = document.getElementById("confirmPassword").value;
  if (!pass1 || pass1.length < 6) fail("password", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  else showErr("password", "", false);

  if (pass1 !== pass2) fail("confirmPassword", "كلمتا المرور غير متطابقتين");
  else showErr("confirmPassword", "", false);

  return valid;
}

// ══════════════════════════════════════════
//  SUBMIT
// ══════════════════════════════════════════
async function handleRegister() {
  if (!validate()) {
    document.querySelector(".ferr.on")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري إنشاء الحساب...';

  const stage = document.getElementById("stage").value;
  const owner = document.querySelector("input[name='idOwner']:checked");

  const payload = {
    fullName:        document.getElementById("fullName").value.trim(),
    stage,
    service:         document.getElementById("service").value,
    gender:          document.getElementById("gender").value,
    birthDate:       document.getElementById("birthDate").value,
    family:          document.getElementById("family").value.trim(),
    nationalId:      document.getElementById("nationalId").value.trim(),
    nationalIdOwner: stage === "حضانة" ? owner.value : "self",
    parentPhone:     document.getElementById("parentPhone").value.trim(),
    studentPhone:    document.getElementById("studentPhone").value.trim(),
    photo:           images.photo,
    birthCert:       images.birth,
    holy:  [...document.querySelectorAll("#holy input:checked")].map(c => c.value).join("\n"),
    sport: [...document.querySelectorAll("#sport input:checked")].map(c => c.value).join("\n"),
    password:        document.getElementById("password").value,
  };

  try {
    const res = await apiRegister(payload);

    if (res.success) {
      showToast("تم إنشاء الحساب بنجاح! 🎉", "success");
      setTimeout(() => window.location.href = "index.html", 2000);

    } else if (res.reason === "duplicate_id") {
      showToast("الرقم القومي ده مسجل من قبل", "error");
      btn.disabled = false;
      btn.innerHTML = "إنشاء الحساب ☩";

    } else {
      throw new Error(res.reason);
    }

  } catch (err) {
    showToast("حدث خطأ، تأكد من الاتصال وحاول مرة أخرى", "error");
    btn.disabled = false;
    btn.innerHTML = "إنشاء الحساب ☩";
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
