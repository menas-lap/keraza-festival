// ══════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════
const SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_URL/exec";

// ══════════════════════════════════════════
//  BASE REQUESTS
// ══════════════════════════════════════════
async function apiPost(payload) {
  const res  = await fetch(SCRIPT_URL, {
    method: "POST",
    body:   JSON.stringify(payload)
  });
  return res.json();
}

async function apiGet(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res   = await fetch(`${SCRIPT_URL}?${query}`);
  return res.json();
}

// ══════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════
async function apiLogin(identifier, password) {
  return apiPost({ action: "login", identifier, password });
}

async function apiRegister(data) {
  return apiPost({ action: "register", ...data });
}

// ══════════════════════════════════════════
//  OPTIONS
// ══════════════════════════════════════════
async function apiGetOptions() {
  return apiGet({ action: "options" });
}

// ══════════════════════════════════════════
//  STUDENTS
// ══════════════════════════════════════════
async function apiGetStudents() {
  const session = getSession();
  const params  = {
    action:  "students",
    role:    session.role,
    service: session.service || "",
    stages:  session.stages  || ""
  };
  return apiGet(params);
}

async function apiUpdateStudent(data) {
  return apiPost({ action: "updateStudent", ...data });
}

async function apiDeleteStudent(studentId) {
  const session = getSession();
  return apiPost({
    action:    "deleteStudent",
    studentId,
    role:      session.role,
    service:   session.service || "",
    stages:    session.stages  || ""
  });
}

async function apiChangePassword(targetId, newPassword, role) {
  return apiPost({
    action:      "changePassword",
    targetId,
    newPassword,
    role
  });
}

// ══════════════════════════════════════════
//  SERVANTS
// ══════════════════════════════════════════
async function apiGetServants() {
  return apiGet({ action: "servants", role: "admin" });
}

async function apiCreateServant(data) {
  return apiPost({ action: "createServant", ...data });
}

async function apiDeleteServant(servantId) {
  return apiPost({ action: "deleteServant", servantId });
}
