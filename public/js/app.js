const app = document.getElementById('app');
const sheetRoot = document.getElementById('sheetRoot');
const toast = document.getElementById('toast');

const state = {
  token: localStorage.getItem('eventease_token') || '',
  user: JSON.parse(localStorage.getItem('eventease_user') || 'null'),
  screen: 'home',
  events: [],
  myEvents: [],
  selectedEvent: null,
  filter: 'All',
  search: '',
  authMode: 'login',
  myTab: 'registered',
  adminData: null,
  adminSearch: ''
};

const icons = {
  bell: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
  search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  arrow: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  back: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  share: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>',
  calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  pin: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>',
  info: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/></svg>',
  user: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function saveSession(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('eventease_token', data.token);
  const userWithoutPicture = { ...data.user };
  delete userWithoutPicture.profilePicture;
  localStorage.setItem('eventease_user', JSON.stringify(userWithoutPicture));
}

function clearSession() {
  state.token = '';
  state.user = null;
  localStorage.removeItem('eventease_token');
  localStorage.removeItem('eventease_user');
}

function dateParts(iso) {
  const date = new Date(iso);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
    date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  };
}

function banner(event, big = false) {
  const lines = String(event.banner_text || event.title).split('|');
  return `
    <div class="banner ${big ? 'big' : ''}" style="--bg-color:#42aaf4">
      <div class="banner-top">
        <span>${escapeHtml(event.category || 'EVENT')} / ${escapeHtml(event.location || 'SPC')}</span>
        <span class="date-pill">${dateParts(event.date).day} ${dateParts(event.date).month}</span>
      </div>
      <div class="banner-title">${lines.map(escapeHtml).join('<br>')}</div>
      <div class="banner-bottom"><span>${escapeHtml(event.banner_tagline || 'MEET. CONNECT. BELONG.')}</span><span>${icons.arrow}</span></div>
    </div>`;
}

function brand() {
  return `<div class="brand"><span style="font-size:22px" aria-hidden="true">🌈</span><span>Event<br>ease</span></div>`;
}

function nav() {
  return `
    <nav class="nav" aria-label="Main navigation">
      <button class="${state.screen === 'home' ? 'active' : ''}" data-nav="home">${icons.home}<span>Home</span></button>
      <button class="${state.screen === 'my-events' ? 'active' : ''}" data-nav="my-events">${icons.calendar}<span>My Events</span></button>
      <button class="${state.screen === 'me' ? 'active' : ''}" data-nav="me">${icons.user}<span>Me</span></button>
    </nav>`;
}

async function loadEvents() {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.filter !== 'All') params.set('category', state.filter);
  state.events = await api(`/api/events?${params}`);
  render();
}

async function loadMyEvents() {
  if (!state.token) return;
  state.myEvents = await api('/api/my-events');
  render();
}

function homeScreen() {
  const featured = state.events[0];
  const rest = state.events.slice(1);
  return `
    <main class="screen">
      <header class="topbar">
        ${brand()}
        <button class="icon-btn" id="reminderBtn" aria-label="Reminders">${icons.bell}<span class="dot"></span></button>
      </header>
      <h2 class="greet">Hi, ${escapeHtml((state.user && state.user.name ? state.user.name.split(' ')[0] : 'Yuta'))} 👋</h2>
      <p class="sub">Your next campus moment starts here.</p>
      <label class="search">${icons.search}<input id="eventSearch" value="${escapeHtml(state.search)}" placeholder="Search campus events" aria-label="Search campus events"></label>
      <div class="chips" aria-label="Event categories">
        ${['All', 'School', 'Sports', 'Seminar', 'Workshop'].map((item) =>
          `<button class="chip ${state.filter === item ? 'active' : ''}" data-filter="${item}">${item === 'All' ? 'All events' : item}</button>`
        ).join('')}
      </div>
      <div class="section-head"><h2>Discover events</h2><span>${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</span></div>
      ${featured ? `
        <article class="feature" data-event="${featured.id}">
          ${banner(featured)}
          <div class="feature-body">
            <div class="row"><h4>${escapeHtml(featured.title)}</h4><span class="tag">${escapeHtml(featured.category)}</span></div>
            <p>${escapeHtml(dateParts(featured.date).month)} ${featured && dateParts(featured.date).day}, ${new Date(featured.date).getFullYear()} &nbsp; · &nbsp; ${escapeHtml(featured.location)}</p>
            <span class="link">View event ${icons.arrow}</span>
          </div>
        </article>` : `<div class="empty"><b>No events found</b>Try another search or category.</div>`}
      ${rest.map((event) => {
        const date = dateParts(event.date);
        return `
          <article class="list-card" data-event="${event.id}">
            <div class="date-tile blue"><small>${date.month}</small><b>${date.day}</b></div>
            <div class="info"><h4>${escapeHtml(event.title)}</h4><p>${date.month} ${date.day}, ${new Date(event.date).getFullYear()} · ${escapeHtml(event.location)}</p></div>
            <span class="chev">${icons.chevron}</span>
          </article>`;
      }).join('')}
    </main>${nav()}`;
}

async function openEvent(id) {
  try {
    state.selectedEvent = await api(`/api/events/${id}`);
    state.screen = 'details';
    render();
  } catch (error) {
    showToast(error.message);
  }
}

function detailsScreen() {
  const event = state.selectedEvent;
  if (!event) return homeScreen();
  const date = dateParts(event.date);
  const isRegistered = Boolean(event.registered);
  const isPast = new Date(event.date) < new Date();
  return `
    <main class="screen">
      <header class="detail-top"><button class="icon-btn" id="backBtn" aria-label="Back">${icons.back}</button><h3>Event Details</h3><button class="icon-btn" id="shareBtn" aria-label="Share">${icons.share}</button></header>
      ${banner(event, true)}
      <div class="tags"><span class="tag">${escapeHtml(event.category)}</span><span class="tag free">${event.free ? 'Free admission' : 'Paid event'}</span></div>
      <h1 class="detail-title">${escapeHtml(event.title)}</h1>
      <div class="info-rows">
        <div class="info-row"><div class="info-ico">${icons.calendar}</div><div><b>${escapeHtml(date.date)}</b><span>${escapeHtml(date.time)}</span></div></div>
        <div class="info-row"><div class="info-ico">${icons.pin}</div><div><b>${escapeHtml(event.location)}</b><span>${escapeHtml(event.location_note || 'On campus')}</span></div></div>
      </div>
      <h2 class="detail-tagline">${escapeHtml(event.tagline || 'A campus moment, together.')}</h2>
      <p class="detail-desc">${escapeHtml(event.description || '')}</p>
      <p class="note">${icons.info}<span>Join to keep this registration in My Events.</span></p>
    </main>
    <div class="cta-bar">
      ${isPast ? '<button class="btn disabled" disabled>Event ended</button>' :
        isRegistered ? '<button class="btn success" id="leaveBtn">Registered ✓</button>' :
        '<button class="btn" id="joinBtn">Join Event <span>' + icons.arrow + '</span></button>'}
    </div>`;
}

async function registerEvent() {
  if (!state.token) {
    state.screen = 'auth';
    render();
    showToast('Log in or register to join.');
    return;
  }
  try {
    await api(`/api/events/${state.selectedEvent.id}/register`, { method: 'POST' });
    state.selectedEvent.registered = 1;
    showToast('You joined the event.');
    await loadMyEventsSilent();
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function leaveEvent() {
  try {
    await api(`/api/events/${state.selectedEvent.id}/register`, { method: 'DELETE' });
    state.selectedEvent.registered = 0;
    showToast('Registration removed.');
    await loadMyEventsSilent();
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadMyEventsSilent() {
  if (state.token) state.myEvents = await api('/api/my-events');
}

function myEventsScreen() {
  if (!state.token) {
    state.screen = 'auth';
    return authScreen();
  }
  const now = new Date();
  const upcoming = state.myEvents.filter((event) => new Date(event.date) >= now);
  const past = state.myEvents.filter((event) => new Date(event.date) < now);
  const visible = state.myTab === 'registered' ? upcoming : past;
  return `
    <main class="screen">
      <header class="page-head"><div class="left">${brand()}<h1>My Events</h1></div><button class="icon-btn" id="reminderBtn" aria-label="Reminders">${icons.bell}</button></header>
      <p class="sub" style="margin-top:-4px">Your plans. All in one place.</p>
      ${state.myEvents.length ? `<div class="success-banner">${icons.check}<div><b>You're registered for ${state.myEvents.length} ${state.myEvents.length === 1 ? 'event' : 'events'}.</b><span>Your registration is saved below.</span></div></div>` : ''}
      <div class="tabs"><button class="tab ${state.myTab === 'registered' ? 'active' : ''}" data-my-tab="registered">Registered (${upcoming.length})</button><button class="tab ${state.myTab === 'past' ? 'active' : ''}" data-my-tab="past">Past events</button></div>
      ${visible.length ? visible.map((event) => {
        const date = dateParts(event.date);
        return `
          <article class="reg-card ${state.myTab === 'past' ? 'past' : ''}" data-event="${event.id}">
            <div class="reg-strip" style="--bg-color:#42aaf4"><span>${escapeHtml(event.title.toUpperCase())}</span><span style="font-size:18px">✦</span></div>
            <div class="reg-body">
              <h4>${escapeHtml(event.title)}</h4><span class="tag green">Registered</span>
              <div class="reg-meta"><div class="date-tile"><small>${date.month}</small><b>${date.day}</b></div><div><b>${escapeHtml(date.date)}</b><span>${escapeHtml(date.time)} · ${escapeHtml(event.location)}</span></div></div>
              <div class="reg-foot"><span class="on-list">${icons.check}<span>You're on the list</span></span><button class="view" data-event="${event.id}">View details ${icons.arrow}</button></div>
            </div>
          </article>`;
      }).join('') : `<div class="empty"><b>No events here</b>${state.myTab === 'registered' ? 'Join an event to see it here.' : 'Past events will appear here.'}</div>`}
      <p class="plan-note">${icons.bell}<span>Plan ahead: check the time and venue before you go.</span></p>
    </main>${nav()}`;
}

function meScreen() {
  if (!state.token) {
    state.screen = 'auth';
    return authScreen();
  }
  const upcoming = state.myEvents.filter((event) => new Date(event.date) >= new Date()).length;
  const canViewAdmin = ['admin', 'staff'].includes(state.user.role);
  const avatar = state.user.profilePicture
    ? `<img src="${escapeHtml(state.user.profilePicture)}" alt="Profile photo">`
    : escapeHtml((state.user.name || 'S')[0].toUpperCase());
  return `
    <main class="screen">
      <header class="topbar">${brand()}</header>
      <h2 class="greet">My Profile</h2>
      <section class="profile-card">
        <div class="avatar profile-avatar">${avatar}</div>
        <h3>${escapeHtml(state.user.name)}</h3><p>${escapeHtml(state.user.email)}</p>
        ${state.user.studentId ? `<p style="margin-top:8px;font-weight:700;color:var(--primary)">ID ${escapeHtml(state.user.studentId)}</p>` : ''}
        <input id="profilePictureInput" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" hidden>
        <button class="photo-button" id="changePhotoBtn" type="button">Change profile photo</button>
        <p class="photo-help">PNG or JPG · max 2 MB. JPG is best for photos.</p>
        <div class="stats"><div class="stat"><b>${state.myEvents.length}</b><span>Registered</span></div><div class="stat"><b>${upcoming}</b><span>Upcoming</span></div></div>
      </section>
      ${canViewAdmin ? '<button class="btn" id="adminBtn" style="margin-top:18px">Open Admin Panel</button>' : ''}
      <button class="btn ghost" id="logoutBtn">Log out</button>
    </main>${nav()}`;
}

function adminUrl() {
  return state.adminSearch
    ? `/api/admin/registrations?studentId=${encodeURIComponent(state.adminSearch)}`
    : '/api/admin/registrations';
}

async function openAdmin(search = state.adminSearch) {
  try {
    state.adminSearch = search.trim();
    state.adminData = await api(adminUrl());
    state.screen = 'admin';
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function updateAccountRole(select) {
  try {
    await api(`/api/admin/users/${select.dataset.userRole}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: select.value })
    });
    state.adminData = await api(adminUrl());
    render();
    showToast('Account role updated.');
  } catch (error) {
    render();
    showToast(error.message);
  }
}

function adminScreen() {
  const data = state.adminData;
  if (!data) return meScreen();
  const canManageRoles = state.user.role === 'admin';
  const studentCount = data.users.filter((user) => user.role === 'student').length;
  return `
    <main class="screen">
      <header class="detail-top">
        <button class="icon-btn" id="adminBackBtn" aria-label="Back">${icons.back}</button>
        <h3>Admin Panel</h3>
        <div style="width:44px"></div>
      </header>
      <h1 class="detail-title">Accounts &amp; registrations</h1>
      <form class="admin-search" id="adminSearchForm">
        <label for="adminStudentId">Search by student ID</label>
        <div class="admin-search-row">
          <input id="adminStudentId" name="studentId" value="${escapeHtml(state.adminSearch)}" placeholder="e.g. 2024-0452" autocomplete="off">
          <button type="submit">Search</button>
        </div>
        <p>Enter all or part of the student's ID.</p>
      </form>
      <p class="sub" style="margin-bottom:18px">${studentCount} students · ${data.registrations.length} event registrations</p>
      <div class="tabs"><button class="tab active">Accounts (${data.users.length})</button></div>
      ${data.users.length ? data.users.map((student) => `
        <article class="list-card">
          <div class="avatar">${escapeHtml((student.name || 'S')[0].toUpperCase())}</div>
          <div class="info">
            <h4>${escapeHtml(student.name)}</h4>
            <p>${escapeHtml(student.studentId || 'No ID')} · ${escapeHtml(student.email)}</p>
            <p><strong>${student.registrationCount}</strong> registered ${student.registrationCount === 1 ? 'event' : 'events'}</p>
          </div>
          ${canManageRoles
            ? `<select class="role-select" data-user-role="${student.id}" aria-label="Role for ${escapeHtml(student.name)}" ${student.id === state.user.id ? 'disabled title="You cannot change your own role."' : ''}>
                ${[['student', 'Student'], ['staff', 'Staff'], ['admin', 'Admin']].map(([value, label]) =>
                  `<option value="${value}" ${student.role === value ? 'selected' : ''}>${label}</option>`
                ).join('')}
              </select>`
            : `<span class="tag ${student.role === 'admin' ? 'green' : ''}">${escapeHtml(student.role)}</span>`}
        </article>`).join('') : `<div class="empty"><b>No matching students</b>Check the ID and search again.</div>`}
      <h2 class="section-head" style="display:block">Event registrations</h2>
      ${data.registrations.length ? data.registrations.map((registration) => `
        <article class="reg-card">
          <div class="reg-strip" style="--bg-color:#42aaf4"><span>${escapeHtml(registration.eventTitle.toUpperCase())}</span><span>✓</span></div>
          <div class="reg-body">
            <h4>${escapeHtml(registration.name)}</h4>
            <p class="sub">${escapeHtml(registration.studentId)} · ${escapeHtml(registration.email)}</p>
            <div class="reg-meta"><div class="date-tile"><small>EVENT</small><b>${escapeHtml(registration.eventId)}</b></div><div><b>${escapeHtml(registration.eventTitle)}</b><span>${escapeHtml(registration.location)}</span></div></div>
          </div>
        </article>`).join('') : `<div class="empty"><b>${state.adminSearch ? 'No matching registrations' : 'No registrations yet'}</b>${state.adminSearch ? 'This student has no registered events.' : 'Students will appear here after joining events.'}</div>`}
    </main>`;
}

function authScreen() {
  const isLogin = state.authMode === 'login';
  return `
    <main class="auth">
      ${brand()}
      <h1>${isLogin ? 'Welcome back' : 'Create account'}</h1>
      <p class="sub">${isLogin ? 'Log in to keep track of campus events.' : 'Register to join school events.'}</p>
      <form id="authForm">
        ${isLogin ? '' : '<label class="field"><span>Name</span><input name="name" autocomplete="name" required></label>'}
        ${isLogin ? '' : '<label class="field"><span>Student ID number</span><input name="studentId" placeholder="ex.2024-0452" pattern="[0-9]{4}-[0-9]{4}" title="Use 4 digits, a hyphen, then 4 digits" aria-describedby="studentIdHelp" required><small id="studentIdHelp" class="field-hint">Use your own IDs.</small></label>'}
        <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
        <label class="field"><span>Password</span><input name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="6" required></label>
        <button class="btn" type="submit">${isLogin ? 'Log in' : 'Register'} ${icons.arrow}</button>
      </form>
      <p class="switch">${isLogin ? 'New to Event Ease?' : 'Already have an account?'} <button id="switchAuth">${isLogin ? 'Create account' : 'Log in'}</button></p>
    </main>`;
}

async function submitAuth(form) {
  const values = Object.fromEntries(new FormData(form));
  try {
    const data = await api(`/api/auth/${state.authMode}`, {
      method: 'POST',
      body: JSON.stringify(values)
    });
    saveSession(data);
    await loadMyEventsSilent();
    state.screen = 'home';
    render();
    showToast(state.authMode === 'login' ? 'Welcome back.' : 'Account created.');
  } catch (error) {
    showToast(error.message);
  }
}

async function updateProfilePicture(file) {
  if (!file) return;
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    showToast('Choose a PNG or JPG image.');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('Image must be 2 MB or smaller.');
    return;
  }

  try {
    const profilePicture = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the selected image.'));
      reader.readAsDataURL(file);
    });
    const result = await api('/api/me/profile-picture', {
      method: 'PUT',
      body: JSON.stringify({ profilePicture })
    });
    state.user.profilePicture = result.profilePicture;
    const userWithoutPicture = { ...state.user };
    delete userWithoutPicture.profilePicture;
    localStorage.setItem('eventease_user', JSON.stringify(userWithoutPicture));
    render();
    showToast('Profile photo updated.');
  } catch (error) {
    showToast(error.message);
  }
}

function reminderSheet() {
  sheetRoot.innerHTML = `
    <div class="overlay" id="overlay">
      <section class="sheet" role="dialog" aria-modal="true" aria-label="Event reminders">
        <div class="grab"></div><h3>Event reminders</h3>
        ${state.myEvents.length ? state.myEvents.map((event) => {
          const date = dateParts(event.date);
          return `<div class="list-card" data-event="${event.id}"><div class="date-tile blue"><small>${date.month}</small><b>${date.day}</b></div><div class="info"><h4>${escapeHtml(event.title)}</h4><p>${escapeHtml(date.time)} · ${escapeHtml(event.location)}</p></div></div>`;
        }).join('') : '<div class="empty"><b>No reminders yet</b>Register for an event to add it here.</div>'}
      </section>
    </div>`;
}

function render() {
  if (!state.user) {
    sheetRoot.innerHTML = '';
  }
  if (state.screen === 'home') app.innerHTML = homeScreen();
  else if (state.screen === 'details') app.innerHTML = detailsScreen();
  else if (state.screen === 'my-events') app.innerHTML = myEventsScreen();
  else if (state.screen === 'me') app.innerHTML = meScreen();
  else if (state.screen === 'admin') app.innerHTML = adminScreen();
  else app.innerHTML = authScreen();
}

app.addEventListener('click', async (event) => {
  const navButton = event.target.closest('[data-nav]');
  if (navButton) {
    state.screen = navButton.dataset.nav;
    if (state.screen === 'my-events' || state.screen === 'me') await loadMyEventsSilent();
    render();
    return;
  }
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) {
    state.filter = filterButton.dataset.filter;
    await loadEvents();
    return;
  }
  const tab = event.target.closest('[data-my-tab]');
  if (tab) {
    state.myTab = tab.dataset.myTab;
    render();
    return;
  }
  const eventCard = event.target.closest('[data-event]');
  if (eventCard) openEvent(eventCard.dataset.event);
  if (event.target.closest('#backBtn')) {
    state.screen = 'home';
    render();
  }
  if (event.target.closest('#adminBackBtn')) {
    state.screen = 'me';
    render();
  }
  if (event.target.closest('#adminBtn')) openAdmin();
  if (event.target.closest('#changePhotoBtn')) {
    document.getElementById('profilePictureInput').click();
  }
  if (event.target.closest('#joinBtn')) registerEvent();
  if (event.target.closest('#leaveBtn')) leaveEvent();
  if (event.target.closest('#reminderBtn')) reminderSheet();
  if (event.target.closest('#logoutBtn')) {
    clearSession();
    state.screen = 'auth';
    state.myEvents = [];
    render();
  }
  if (event.target.closest('#switchAuth')) {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    render();
  }
  if (event.target.closest('#shareBtn') && navigator.share) {
    navigator.share({ title: state.selectedEvent.title, text: state.selectedEvent.description, url: location.href }).catch(() => {});
  }
});

app.addEventListener('input', (event) => {
  if (event.target.id !== 'eventSearch') return;
  state.search = event.target.value;
  clearTimeout(app.searchTimer);
  app.searchTimer = setTimeout(loadEvents, 250);
});

app.addEventListener('change', (event) => {
  if (event.target.id === 'profilePictureInput') {
    updateProfilePicture(event.target.files[0]);
  }
  if (event.target.matches('[data-user-role]')) {
    updateAccountRole(event.target);
  }
});

app.addEventListener('submit', (event) => {
  if (event.target.id === 'authForm') {
    event.preventDefault();
    submitAuth(event.target);
  }
  if (event.target.id === 'adminSearchForm') {
    event.preventDefault();
    openAdmin(new FormData(event.target).get('studentId') || '');
  }
});

sheetRoot.addEventListener('click', (event) => {
  if (event.target.id === 'overlay') sheetRoot.innerHTML = '';
  const card = event.target.closest('[data-event]');
  if (card) {
    sheetRoot.innerHTML = '';
    openEvent(card.dataset.event);
  }
});

async function init() {
  try {
    const refreshUser = state.token
      ? api('/api/me').then((user) => {
        state.user = user;
        const userWithoutPicture = { ...user };
        delete userWithoutPicture.profilePicture;
        localStorage.setItem('eventease_user', JSON.stringify(userWithoutPicture));
      })
      : Promise.resolve();
    await Promise.all([loadEvents(), state.token ? loadMyEventsSilent() : Promise.resolve(), refreshUser]);
    render();
  } catch (error) {
    app.innerHTML = `<div class="empty" style="margin:20px"><b>Could not connect</b>${escapeHtml(error.message)}</div>`;
  }
}

init();