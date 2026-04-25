/* =========================================================
   shared.js — Smile Haus Review Dashboard
   Auth helpers + API client
   ========================================================= */

const WORKER = 'https://sh-da-review-worker.smilehaus.workers.dev';
const JWT_KEY = 'sh_review_auth';

// ── Auth helpers ────────────────────────────────────────────

function getJwt() {
  return localStorage.getItem(JWT_KEY);
}

function setJwt(token) {
  localStorage.setItem(JWT_KEY, token);
}

function clearJwt() {
  localStorage.removeItem(JWT_KEY);
}

function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    return null;
  }
}

function isJwtExpired(token) {
  const p = parseJwtPayload(token);
  if (!p || !p.exp) return true;
  return Date.now() / 1000 > p.exp;
}

function requireAuth() {
  const token = getJwt();
  if (!token || isJwtExpired(token)) {
    clearJwt();
    window.location.href = 'login.html';
    return null;
  }
  return token;
}

function logout() {
  clearJwt();
  window.location.href = 'login.html';
}

// ── API client ───────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const token = getJwt();
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(WORKER + path, {
    ...opts,
    headers,
    body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
  });

  if (res.status === 401) {
    clearJwt();
    window.location.href = 'login.html';
    return null;
  }

  return res;
}

// ── UI helpers ───────────────────────────────────────────────

function showError(el, msg) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError(el) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  el.style.display = 'none';
}

function renderUserBar(containerSelector) {
  const token = getJwt();
  if (!token) return;
  const p = parseJwtPayload(token);
  if (!p) return;

  const bar = document.querySelector(containerSelector);
  if (!bar) return;

  const roleLabel = p.role === 'Admin' ? 'Admin' :
                    p.role === 'Regional' ? 'Regional Manager' : 'Office Manager';

  bar.innerHTML = `
    <span class="user-name">${p.name}</span>
    <span class="user-role">${roleLabel}</span>
    <button class="btn-ghost btn-sm" onclick="logout()">Sign Out</button>
  `;
}

function formatDate(ts) {
  if (!ts) return '—';
  // Coerce numeric strings ("1745618400000") to number first
  const n = typeof ts === 'string' && /^\d+$/.test(ts) ? Number(ts) : ts;
  // ClickUp returns ms; epoch seconds are < 1e10
  const d = new Date(typeof n === 'number' && n < 1e10 ? n * 1000 : n);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
