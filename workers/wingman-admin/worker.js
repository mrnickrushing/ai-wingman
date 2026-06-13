// AI Wingman Admin — password auth via cookie, D1 for data, APNs for push notifications
// Required env vars: ADMIN_PASSWORD, APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (base64 .p8), APNS_BUNDLE_ID
// D1 binding: DB

const SESSION_COOKIE = 'wm_admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Wingman Admin</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎛️</text></svg>" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#070710;--bg2:#0d0d1a;--bg3:#13132a;--border:rgba(255,255,255,.07);--indigo:#6366f1;--violet:#8b5cf6;--cyan:#22d3ee;--green:#4ade80;--pink:#ec4899;--amber:#f59e0b;--text:#f1f5f9;--muted:#94a3b8;--radius:12px}
    body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100vh}

    /* SIDEBAR */
    .layout{display:flex;min-height:100vh}
    .sidebar{width:240px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:1.5rem 0;position:fixed;top:0;left:0;bottom:0;z-index:50}
    .sidebar-logo{padding:0 1.5rem 1.5rem;font-size:1rem;font-weight:700;background:linear-gradient(135deg,var(--indigo),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .sidebar-section{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:.75rem 1.5rem .4rem}
    .sidebar-link{display:flex;align-items:center;gap:.75rem;padding:.65rem 1.5rem;color:var(--muted);text-decoration:none;font-size:.9rem;cursor:pointer;border:none;background:none;width:100%;text-align:left;transition:color .15s,background .15s}
    .sidebar-link:hover,.sidebar-link.active{color:var(--text);background:rgba(255,255,255,.04)}
    .sidebar-link.active{border-left:2px solid var(--indigo);padding-left:calc(1.5rem - 2px)}
    .sidebar-link span:first-child{font-size:1.1rem}
    .sidebar-footer{margin-top:auto;padding:1.5rem}
    .logout-btn{width:100%;background:rgba(236,72,153,.1);border:1px solid rgba(236,72,153,.2);color:var(--pink);border-radius:8px;padding:.6rem;font-size:.85rem;cursor:pointer;transition:background .15s}
    .logout-btn:hover{background:rgba(236,72,153,.2)}

    /* MAIN */
    .main{margin-left:240px;flex:1;padding:2rem;min-height:100vh}
    .page{display:none}.page.active{display:block}
    .page-header{margin-bottom:2rem}
    .page-title{font-size:1.6rem;font-weight:800;letter-spacing:-0.02em}
    .page-sub{color:var(--muted);font-size:.9rem;margin-top:.3rem}

    /* STATS */
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:2rem}
    .stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem}
    .stat-label{font-size:.75rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em}
    .stat-value{font-size:2rem;font-weight:800;margin-top:.25rem}
    .stat-value.indigo{color:var(--indigo)}.stat-value.green{color:var(--green)}.stat-value.amber{color:var(--amber)}.stat-value.cyan{color:var(--cyan)}

    /* TABLE */
    .card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
    .card-header{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
    .card-header h3{font-size:1rem;font-weight:700}
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:.875rem}
    th{padding:.75rem 1.5rem;text-align:left;color:var(--muted);font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border)}
    td{padding:.85rem 1.5rem;border-bottom:1px solid var(--border);color:var(--text)}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:rgba(255,255,255,.02)}
    .badge{display:inline-block;padding:.2rem .6rem;border-radius:6px;font-size:.75rem;font-weight:600}
    .badge-indigo{background:rgba(99,102,241,.15);color:var(--indigo)}
    .badge-green{background:rgba(74,222,128,.15);color:var(--green)}
    .badge-amber{background:rgba(245,158,11,.15);color:var(--amber)}
    .badge-pink{background:rgba(236,72,153,.15);color:var(--pink)}
    .badge-muted{background:rgba(148,163,184,.1);color:var(--muted)}
    .empty{text-align:center;padding:3rem;color:var(--muted);font-size:.9rem}

    /* SEARCH & FILTERS */
    .toolbar{padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;gap:.75rem;align-items:center;flex-wrap:wrap}
    .search-input{flex:1;min-width:200px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:.55rem 1rem;color:var(--text);font-size:.875rem;outline:none}
    .search-input:focus{border-color:var(--indigo)}
    .search-input::placeholder{color:var(--muted)}
    .filter-select{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:.55rem .8rem;color:var(--text);font-size:.8rem;outline:none;cursor:pointer}

    /* NOTIFICATIONS */
    .notif-form{padding:1.5rem;display:flex;flex-direction:column;gap:1rem}
    .form-label{font-size:.8rem;font-weight:600;color:var(--muted);display:block;margin-bottom:.35rem}
    .form-input{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:.65rem 1rem;color:var(--text);font-size:.9rem;outline:none;font-family:inherit;transition:border-color .2s;resize:vertical}
    .form-input:focus{border-color:var(--indigo)}
    .form-input::placeholder{color:var(--muted)}
    .char-count{font-size:.75rem;color:var(--muted);text-align:right;margin-top:.25rem}
    .target-pills{display:flex;gap:.5rem;flex-wrap:wrap}
    .pill{display:flex;align-items:center;gap:.4rem;background:var(--bg3);border:1px solid var(--border);border-radius:20px;padding:.35rem .9rem;font-size:.8rem;cursor:pointer;transition:all .15s;user-select:none}
    .pill.selected{background:rgba(99,102,241,.15);border-color:var(--indigo);color:var(--text)}
    .pill input{display:none}
    .send-btn{background:linear-gradient(135deg,var(--indigo),var(--violet));color:#fff;border:none;border-radius:10px;padding:.8rem 1.5rem;font-size:.9rem;font-weight:600;cursor:pointer;transition:opacity .2s;align-self:flex-start}
    .send-btn:hover{opacity:.9}
    .send-btn:disabled{opacity:.4;cursor:not-allowed}
    .notif-history{margin-top:1.5rem}
    #notif-feedback{padding:.6rem 1rem;border-radius:8px;font-size:.85rem;display:none}
    #notif-feedback.success{background:rgba(74,222,128,.1);color:var(--green);border:1px solid rgba(74,222,128,.2)}
    #notif-feedback.error{background:rgba(236,72,153,.1);color:var(--pink);border:1px solid rgba(236,72,153,.2)}

    /* PAGINATION */
    .pagination{display:flex;align-items:center;gap:.5rem;padding:1rem 1.5rem;border-top:1px solid var(--border)}
    .pag-btn{background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:.4rem .8rem;font-size:.8rem;cursor:pointer;transition:background .15s}
    .pag-btn:hover:not(:disabled){background:rgba(255,255,255,.06)}
    .pag-btn:disabled{opacity:.35;cursor:default}
    .pag-info{font-size:.8rem;color:var(--muted);flex:1;text-align:center}

    /* TOAST */
    .toast{position:fixed;bottom:2rem;right:2rem;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:.8rem 1.25rem;font-size:.875rem;z-index:999;transform:translateY(120%);transition:transform .3s;box-shadow:0 8px 32px rgba(0,0,0,.4)}
    .toast.show{transform:translateY(0)}
    .toast.success{border-color:rgba(74,222,128,.3)}
    .toast.error{border-color:rgba(236,72,153,.3)}

    @media(max-width:768px){.sidebar{width:100%;position:relative;height:auto}.main{margin-left:0}}
  </style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-logo">🎛️ Wingman Admin</div>
    <div class="sidebar-section">Overview</div>
    <button class="sidebar-link active" onclick="showPage('dashboard',this)"><span>📊</span><span>Dashboard</span></button>
    <div class="sidebar-section">Users</div>
    <button class="sidebar-link" onclick="showPage('waitlist',this)"><span>📋</span><span>Waitlist</span></button>
    <button class="sidebar-link" onclick="showPage('users',this)"><span>👤</span><span>App Users</span></button>
    <div class="sidebar-section">Engagement</div>
    <button class="sidebar-link" onclick="showPage('notifications',this)"><span>🔔</span><span>Push Notifications</span></button>
    <button class="sidebar-link" onclick="showPage('support',this)"><span>💬</span><span>Support Requests</span></button>
    <div class="sidebar-footer">
      <button class="logout-btn" onclick="logout()">Sign out</button>
    </div>
  </aside>

  <main class="main">
    <!-- DASHBOARD -->
    <div id="page-dashboard" class="page active">
      <div class="page-header">
        <div class="page-title">Dashboard</div>
        <div class="page-sub">AI Wingman at a glance</div>
      </div>
      <div class="stats" id="stats-grid">
        <div class="stat-card"><div class="stat-label">Waitlist</div><div class="stat-value indigo" id="stat-waitlist">—</div></div>
        <div class="stat-card"><div class="stat-label">App Users</div><div class="stat-value green" id="stat-users">—</div></div>
        <div class="stat-card"><div class="stat-label">Support Requests</div><div class="stat-value amber" id="stat-support">—</div></div>
        <div class="stat-card"><div class="stat-label">Notifications Sent</div><div class="stat-value cyan" id="stat-notifs">—</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent waitlist signups</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Mode interest</th><th>Signed up</th></tr></thead>
            <tbody id="recent-waitlist"><tr><td colspan="4" class="empty">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- WAITLIST -->
    <div id="page-waitlist" class="page">
      <div class="page-header">
        <div class="page-title">Waitlist</div>
        <div class="page-sub" id="waitlist-count">Loading...</div>
      </div>
      <div class="card">
        <div class="toolbar">
          <input class="search-input" id="wl-search" placeholder="Search name or email..." oninput="filterWaitlist()" />
          <select class="filter-select" id="wl-mode-filter" onchange="filterWaitlist()">
            <option value="">All modes</option>
            <option value="sales">Sales</option>
            <option value="dating">Dating</option>
            <option value="networking">Networking</option>
            <option value="pitching">Pitching</option>
            <option value="hard">Hard Conversations</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Mode</th><th>Date</th></tr></thead>
            <tbody id="waitlist-tbody"><tr><td colspan="4" class="empty">Loading...</td></tr></tbody>
          </table>
        </div>
        <div class="pagination">
          <button class="pag-btn" id="wl-prev" onclick="wlPage--; renderWaitlist()" disabled>← Prev</button>
          <div class="pag-info" id="wl-pag-info"></div>
          <button class="pag-btn" id="wl-next" onclick="wlPage++; renderWaitlist()">Next →</button>
        </div>
      </div>
    </div>

    <!-- APP USERS -->
    <div id="page-users" class="page">
      <div class="page-header">
        <div class="page-title">App Users</div>
        <div class="page-sub" id="users-count">Loading...</div>
      </div>
      <div class="card">
        <div class="toolbar">
          <input class="search-input" id="users-search" placeholder="Search name or email..." oninput="filterUsers()" />
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Platform</th><th>Push token</th><th>Joined</th></tr></thead>
            <tbody id="users-tbody"><tr><td colspan="5" class="empty">Loading...</td></tr></tbody>
          </table>
        </div>
        <div class="pagination">
          <button class="pag-btn" id="users-prev" onclick="usersPage--; renderUsers()" disabled>← Prev</button>
          <div class="pag-info" id="users-pag-info"></div>
          <button class="pag-btn" id="users-next" onclick="usersPage++; renderUsers()">Next →</button>
        </div>
      </div>
    </div>

    <!-- NOTIFICATIONS -->
    <div id="page-notifications" class="page">
      <div class="page-header">
        <div class="page-title">Push Notifications</div>
        <div class="page-sub">Send to all users or a specific segment</div>
      </div>
      <div class="card" style="margin-bottom:1.5rem">
        <div class="card-header"><h3>Compose notification</h3></div>
        <div class="notif-form">
          <div>
            <label class="form-label">Title</label>
            <input class="form-input" type="text" id="notif-title" placeholder="e.g. New feature unlocked 🎉" maxlength="60" oninput="updateCharCount('notif-title','tc',60)" />
            <div class="char-count"><span id="tc">0</span>/60</div>
          </div>
          <div>
            <label class="form-label">Message body</label>
            <textarea class="form-input" id="notif-body" rows="3" placeholder="e.g. Dating mode is now live. Tap to try it." maxlength="200" oninput="updateCharCount('notif-body','bc',200)"></textarea>
            <div class="char-count"><span id="bc">0</span>/200</div>
          </div>
          <div>
            <label class="form-label">Target</label>
            <div class="target-pills">
              <label class="pill selected" id="pill-all" onclick="selectTarget('all')"><input type="radio" name="target" value="all" checked />📣 All users</label>
              <label class="pill" id="pill-ios" onclick="selectTarget('ios')"><input type="radio" name="target" value="ios" />🍎 iOS only</label>
              <label class="pill" id="pill-android" onclick="selectTarget('android')"><input type="radio" name="target" value="android" />🤖 Android only</label>
            </div>
          </div>
          <div>
            <button class="send-btn" onclick="sendNotification()">Send notification →</button>
            <div id="notif-feedback"></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Notification history</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Body</th><th>Target</th><th>Recipients</th><th>Sent</th></tr></thead>
            <tbody id="notif-history-tbody"><tr><td colspan="5" class="empty">No notifications sent yet</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- SUPPORT -->
    <div id="page-support" class="page">
      <div class="page-header">
        <div class="page-title">Support Requests</div>
        <div class="page-sub" id="support-count">Loading...</div>
      </div>
      <div class="card">
        <div class="toolbar">
          <input class="search-input" id="support-search" placeholder="Search name, email, or message..." oninput="filterSupport()" />
          <select class="filter-select" id="support-topic-filter" onchange="filterSupport()">
            <option value="">All topics</option>
            <option value="bug">Bug report</option>
            <option value="billing">Billing</option>
            <option value="feature">Feature request</option>
            <option value="account">Account issue</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Topic</th><th>Message</th><th>Date</th></tr></thead>
            <tbody id="support-tbody"><tr><td colspan="5" class="empty">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</div>

<div class="toast" id="toast"></div>

<script>
let allWaitlist = [], filteredWaitlist = [], wlPage = 0;
let allUsers = [], filteredUsers = [], usersPage = 0;
let allSupport = [], filteredSupport = [];
let notifTarget = 'all';
const PAGE_SIZE = 20;

async function api(path) {
  const r = await fetch(path);
  if (r.status === 401) { location.href = '/login'; return null; }
  return r.json();
}

function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (el) el.classList.add('active');
  if (id === 'dashboard') loadDashboard();
  if (id === 'waitlist') loadWaitlist();
  if (id === 'users') loadUsers();
  if (id === 'support') loadSupport();
  if (id === 'notifications') loadNotifHistory();
}

async function loadDashboard() {
  const data = await api('/api/stats');
  if (!data) return;
  document.getElementById('stat-waitlist').textContent = data.waitlist ?? 0;
  document.getElementById('stat-users').textContent = data.users ?? 0;
  document.getElementById('stat-support').textContent = data.support ?? 0;
  document.getElementById('stat-notifs').textContent = data.notifications ?? 0;
  const rows = (data.recentWaitlist || []).map(r =>
    \`<tr><td>\${esc(r.name)}</td><td>\${esc(r.email)}</td><td>\${modeBadge(r.mode)}</td><td>\${fmtDate(r.created_at)}</td></tr>\`
  ).join('') || '<tr><td colspan="4" class="empty">No signups yet</td></tr>';
  document.getElementById('recent-waitlist').innerHTML = rows;
}

async function loadWaitlist() {
  const data = await api('/api/waitlist');
  if (!data) return;
  allWaitlist = data.rows || [];
  filteredWaitlist = [...allWaitlist];
  document.getElementById('waitlist-count').textContent = allWaitlist.length + ' signups';
  wlPage = 0; renderWaitlist();
}
function filterWaitlist() {
  const q = document.getElementById('wl-search').value.toLowerCase();
  const m = document.getElementById('wl-mode-filter').value;
  filteredWaitlist = allWaitlist.filter(r =>
    (!q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)) &&
    (!m || r.mode === m)
  );
  wlPage = 0; renderWaitlist();
}
function renderWaitlist() {
  const start = wlPage * PAGE_SIZE, end = start + PAGE_SIZE;
  const page = filteredWaitlist.slice(start, end);
  const tbody = document.getElementById('waitlist-tbody');
  tbody.innerHTML = page.length ? page.map(r =>
    \`<tr><td>\${esc(r.name)}</td><td>\${esc(r.email)}</td><td>\${modeBadge(r.mode)}</td><td>\${fmtDate(r.created_at)}</td></tr>\`
  ).join('') : '<tr><td colspan="4" class="empty">No results</td></tr>';
  const total = filteredWaitlist.length, pages = Math.ceil(total / PAGE_SIZE);
  document.getElementById('wl-pag-info').textContent = total ? \`\${start+1}–\${Math.min(end,total)} of \${total}\` : '';
  document.getElementById('wl-prev').disabled = wlPage === 0;
  document.getElementById('wl-next').disabled = end >= total;
}

async function loadUsers() {
  const data = await api('/api/users');
  if (!data) return;
  allUsers = data.rows || [];
  filteredUsers = [...allUsers];
  document.getElementById('users-count').textContent = allUsers.length + ' users';
  usersPage = 0; renderUsers();
}
function filterUsers() {
  const q = document.getElementById('users-search').value.toLowerCase();
  filteredUsers = allUsers.filter(r => !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q));
  usersPage = 0; renderUsers();
}
function renderUsers() {
  const start = usersPage * PAGE_SIZE, end = start + PAGE_SIZE;
  const page = filteredUsers.slice(start, end);
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = page.length ? page.map(r =>
    \`<tr>
      <td>\${esc(r.name)}</td>
      <td>\${esc(r.email)}</td>
      <td>\${r.platform === 'ios' ? '🍎 iOS' : r.platform === 'android' ? '🤖 Android' : '—'}</td>
      <td><span style="font-family:monospace;font-size:.75rem;color:var(--muted)">\${r.push_token ? r.push_token.slice(0,16)+'...' : '—'}</span></td>
      <td>\${fmtDate(r.created_at)}</td>
    </tr>\`
  ).join('') : '<tr><td colspan="5" class="empty">No results</td></tr>';
  const total = filteredUsers.length;
  document.getElementById('users-pag-info').textContent = total ? \`\${start+1}–\${Math.min(end,total)} of \${total}\` : '';
  document.getElementById('users-prev').disabled = usersPage === 0;
  document.getElementById('users-next').disabled = end >= total;
}

async function loadSupport() {
  const data = await api('/api/support');
  if (!data) return;
  allSupport = data.rows || [];
  filteredSupport = [...allSupport];
  document.getElementById('support-count').textContent = allSupport.length + ' requests';
  renderSupport();
}
function filterSupport() {
  const q = document.getElementById('support-search').value.toLowerCase();
  const t = document.getElementById('support-topic-filter').value;
  filteredSupport = allSupport.filter(r =>
    (!q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q)) &&
    (!t || r.topic === t)
  );
  renderSupport();
}
function renderSupport() {
  document.getElementById('support-tbody').innerHTML = filteredSupport.length ?
    filteredSupport.map(r => \`<tr>
      <td>\${esc(r.name)}</td>
      <td>\${esc(r.email)}</td>
      <td>\${topicBadge(r.topic)}</td>
      <td style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${esc(r.message)}</td>
      <td>\${fmtDate(r.created_at)}</td>
    </tr>\`).join('') :
    '<tr><td colspan="5" class="empty">No results</td></tr>';
}

async function loadNotifHistory() {
  const data = await api('/api/notifications');
  if (!data) return;
  const rows = (data.rows || []);
  document.getElementById('notif-history-tbody').innerHTML = rows.length ?
    rows.map(r => \`<tr>
      <td>\${esc(r.title)}</td>
      <td>\${esc(r.body)}</td>
      <td>\${esc(r.target)}</td>
      <td>\${r.recipient_count ?? '—'}</td>
      <td>\${fmtDate(r.created_at)}</td>
    </tr>\`).join('') :
    '<tr><td colspan="5" class="empty">No notifications sent yet</td></tr>';
}

function selectTarget(t) {
  notifTarget = t;
  ['all','ios','android'].forEach(id => {
    document.getElementById('pill-'+id).classList.toggle('selected', id === t);
  });
}

async function sendNotification() {
  const title = document.getElementById('notif-title').value.trim();
  const body = document.getElementById('notif-body').value.trim();
  const fb = document.getElementById('notif-feedback');
  if (!title || !body) { showFeedback('error', 'Title and message are required.'); return; }
  const btn = document.querySelector('.send-btn');
  btn.disabled = true; btn.textContent = 'Sending...';
  try {
    const res = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, target: notifTarget })
    });
    const data = await res.json();
    if (res.ok) {
      showFeedback('success', \`✓ Sent to \${data.sent} device\${data.sent !== 1 ? 's' : ''}.\`);
      document.getElementById('notif-title').value = '';
      document.getElementById('notif-body').value = '';
      document.getElementById('tc').textContent = '0';
      document.getElementById('bc').textContent = '0';
      loadNotifHistory();
      loadDashboard();
    } else {
      showFeedback('error', data.error || 'Failed to send.');
    }
  } catch { showFeedback('error', 'Network error.'); }
  finally { btn.disabled = false; btn.textContent = 'Send notification →'; }
}

function showFeedback(type, msg) {
  const el = document.getElementById('notif-feedback');
  el.textContent = msg; el.className = type; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}
function updateCharCount(inputId, countId, max) {
  document.getElementById(countId).textContent = document.getElementById(inputId).value.length;
}

async function logout() {
  await fetch('/logout', { method: 'POST' });
  location.href = '/login';
}

function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function fmtDate(s) { if(!s) return '—'; try { return new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch{ return s; } }
function modeBadge(m) {
  const map = { sales:'indigo', dating:'pink', networking:'green', pitching:'amber', hard:'muted' };
  const labels = { sales:'Sales', dating:'Dating', networking:'Networking', pitching:'Pitching', hard:'Hard Convos' };
  return m ? \`<span class="badge badge-\${map[m]||'muted'}">\${labels[m]||m}</span>\` : '—';
}
function topicBadge(t) {
  const map = { bug:'pink', billing:'amber', feature:'indigo', account:'cyan', other:'muted' };
  return t ? \`<span class="badge badge-\${map[t]||'muted'}">\${t}</span>\` : '—';
}
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = \`toast \${type} show\`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// Init
loadDashboard();
</script>
</body>
</html>`;

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin Login — AI Wingman</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎛️</text></svg>" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#070710;color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased}
    .card{background:#0d0d1a;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:2.5rem;width:100%;max-width:380px}
    .logo{text-align:center;margin-bottom:2rem}
    .logo-icon{font-size:2.5rem;margin-bottom:.5rem}
    .logo h1{font-size:1.2rem;font-weight:700;color:#f1f5f9}
    .logo p{font-size:.85rem;color:#94a3b8;margin-top:.25rem}
    label{display:block;font-size:.8rem;font-weight:600;color:#94a3b8;margin-bottom:.4rem}
    input{width:100%;background:#13132a;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:.75rem 1rem;color:#f1f5f9;font-size:.95rem;outline:none;transition:border-color .2s;margin-bottom:1rem}
    input:focus{border-color:#6366f1}
    input::placeholder{color:#475569}
    button{width:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;padding:.85rem;font-size:.95rem;font-weight:600;cursor:pointer;transition:opacity .2s}
    button:hover{opacity:.9}
    button:disabled{opacity:.5;cursor:not-allowed}
    #err{color:#ec4899;font-size:.85rem;margin-top:.75rem;text-align:center;min-height:1.2rem}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-icon">🎛️</div>
    <h1>Wingman Admin</h1>
    <p>Sign in to continue</p>
  </div>
  <form onsubmit="login(event)">
    <label>Password</label>
    <input type="password" id="pw" placeholder="Admin password" autocomplete="current-password" required autofocus />
    <button type="submit" id="btn">Sign in</button>
    <div id="err"></div>
  </form>
</div>
<script>
async function login(e) {
  e.preventDefault();
  const btn = document.getElementById('btn');
  const err = document.getElementById('err');
  btn.disabled = true; btn.textContent = 'Signing in...'; err.textContent = '';
  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('pw').value })
    });
    if (res.ok) { location.href = '/'; return; }
    err.textContent = 'Incorrect password.';
  } catch { err.textContent = 'Network error.'; }
  btn.disabled = false; btn.textContent = 'Sign in';
}
</script>
</body>
</html>`;

// ─── Session store (KV-backed) ───────────────────────────────────────────────
async function createSession(env) {
  const id = crypto.randomUUID();
  if (env.SESSIONS) {
    await env.SESSIONS.put(id, '1', { expirationTtl: Math.floor(SESSION_DURATION_MS / 1000) });
  }
  return id;
}
async function validateSession(env, id) {
  if (!id) return false;
  if (!env.SESSIONS) return true; // dev mode — no KV bound
  const val = await env.SESSIONS.get(id);
  return val !== null;
}

// ─── APNs helper ─────────────────────────────────────────────────────────────
async function sendApnsNotification(env, deviceToken, title, body) {
  if (!env.APNS_PRIVATE_KEY || !env.APNS_KEY_ID || !env.APNS_TEAM_ID || !env.APNS_BUNDLE_ID) {
    return { ok: false, error: 'APNs not configured' };
  }
  try {
    const jwt = await makeApnsJwt(env);
    const host = 'https://api.push.apple.com';
    const url = `${host}/3/device/${deviceToken}`;
    const payload = JSON.stringify({ aps: { alert: { title, body }, sound: 'default' } });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': env.APNS_BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: payload,
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function makeApnsJwt(env) {
  // APNs JWT: ES256, kid = APNS_KEY_ID, iss = APNS_TEAM_ID
  const header = { alg: 'ES256', kid: env.APNS_KEY_ID };
  const payload = { iss: env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) };
  const enc = (obj) => btoa(JSON.stringify(obj)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const keyData = atob(env.APNS_PRIVATE_KEY.replace(/-----[^-]+-----/g,'').replace(/\s/g,''));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(keyData, c => c.charCodeAt(0)),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${signingInput}.${sigB64}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const sessionId = getCookie(request, SESSION_COOKIE);
    const authed = await validateSession(env, sessionId);

    // Login page
    if (path === '/login' && method === 'GET') {
      if (authed) return redirect('/');
      return html(LOGIN_HTML);
    }

    // Login POST
    if (path === '/login' && method === 'POST') {
      const { password } = await request.json().catch(() => ({}));
      if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
        return json({ error: 'Incorrect password' }, 401);
      }
      const id = await createSession(env);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${SESSION_COOKIE}=${id}; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION_MS / 1000}; Path=/`,
        },
      });
    }

    // Logout
    if (path === '/logout' && method === 'POST') {
      return new Response('{}', {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`,
        },
      });
    }

    // Auth gate — API routes get 401 JSON so the SPA can handle it; page routes redirect
    if (!authed) {
      if (path.startsWith('/api/')) return json({ error: 'Unauthorized' }, 401);
      return redirect('/login');
    }

    // Admin dashboard SPA
    if (path === '/' || path === '') return html(ADMIN_HTML);

    // ── API routes ──
    if (!path.startsWith('/api/')) return json({ error: 'Not found' }, 404);

    if (!env.DB) return json({ error: 'Database not configured' }, 500);

    // Stats
    if (path === '/api/stats' && method === 'GET') {
      const [wl, us, sp, nt, recent] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as c FROM waitlist').first(),
        env.DB.prepare('SELECT COUNT(*) as c FROM users').first().catch(() => ({ c: 0 })),
        env.DB.prepare('SELECT COUNT(*) as c FROM support_requests').first().catch(() => ({ c: 0 })),
        env.DB.prepare('SELECT COUNT(*) as c FROM notification_log').first().catch(() => ({ c: 0 })),
        env.DB.prepare('SELECT name, email, mode, created_at FROM waitlist ORDER BY created_at DESC LIMIT 5').all(),
      ]);
      return json({ waitlist: wl?.c ?? 0, users: us?.c ?? 0, support: sp?.c ?? 0, notifications: nt?.c ?? 0, recentWaitlist: recent.results });
    }

    // Waitlist
    if (path === '/api/waitlist' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM waitlist ORDER BY created_at DESC').all();
      return json({ rows: results });
    }

    // Users
    if (path === '/api/users' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all().catch(() => ({ results: [] }));
      return json({ rows: results });
    }

    // Support requests
    if (path === '/api/support' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM support_requests ORDER BY created_at DESC').all().catch(() => ({ results: [] }));
      return json({ rows: results });
    }

    // Notification history
    if (path === '/api/notifications' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM notification_log ORDER BY created_at DESC LIMIT 50').all().catch(() => ({ results: [] }));
      return json({ rows: results });
    }

    // Send notification
    if (path === '/api/send-notification' && method === 'POST') {
      const { title, body, target } = await request.json().catch(() => ({}));
      if (!title || !body) return json({ error: 'Title and body required' }, 400);

      let query = 'SELECT push_token, platform FROM users WHERE push_token IS NOT NULL';
      if (target === 'ios') query += " AND platform = 'ios'";
      if (target === 'android') query += " AND platform = 'android'";

      const { results: devices } = await env.DB.prepare(query).all().catch(() => ({ results: [] }));

      let sent = 0;
      for (const device of devices) {
        if (device.platform === 'ios' && device.push_token) {
          const res = await sendApnsNotification(env, device.push_token, title, body);
          if (res.ok) sent++;
        }
        // Android (FCM) support can be added here
      }

      await env.DB.prepare(
        'INSERT INTO notification_log (title, body, target, recipient_count, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(title, body, target || 'all', sent, new Date().toISOString()).run().catch(() => {});

      return json({ ok: true, sent });
    }

    return json({ error: 'Not found' }, 404);
  },
};

function html(content) {
  return new Response(content, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function redirect(path) {
  return new Response(null, { status: 302, headers: { Location: path } });
}
function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}
