// ══════════════════════════════════════════
//  SESSION MANAGEMENT
// ══════════════════════════════════════════
const SESSION_KEY = "keraza_session";

function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

// ── Guard: call this at the top of each dashboard page ──
function requireRole(expectedRole) {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  if (expectedRole && session.role !== expectedRole) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

// ── After login, redirect based on role ──
function redirectByRole(role) {
  const routes = {
    student: "student.html",
    servant: "servant.html",
    admin:   "admin.html"
  };
  window.location.href = routes[role] || "index.html";
}

// ══════════════════════════════════════════
//  TOGGLES - Save & get
// ══════════════════════════════════════════
function saveToggles(toggles) {
  localStorage.setItem("keraza_toggles", JSON.stringify(toggles));
}

function getToggles() {
  const raw = localStorage.getItem("keraza_toggles");
  return raw ? JSON.parse(raw) : { student_edit: true, servant_edit: true };
}
