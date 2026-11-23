const express = require('express');
const path = require('path');
const { DatabaseSync } = require('node:sqlite'); // built into Node, no install needed
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'eventease-dev-secret-change-me';
const db = new DatabaseSync(path.join(__dirname, 'eventease.db'));

db.exec('PRAGMA foreign_keys = ON;');

/* ---------- DATABASE ---------- */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    student_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'student',
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    banner_text TEXT NOT NULL,
    banner_tagline TEXT,
    tagline TEXT,
    description TEXT,
    date TEXT NOT NULL,          -- local ISO: YYYY-MM-DDTHH:MM:00
    location TEXT NOT NULL,
    location_note TEXT,
    free INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, event_id)
  );
`);

function ensureUserColumn(column, definition) {
  const columns = db.prepare('PRAGMA table_info(users)').all();
  if (!columns.some((columnInfo) => columnInfo.name === column)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
  }
}

ensureUserColumn('student_id', 'TEXT');
ensureUserColumn('role', "TEXT NOT NULL DEFAULT 'student'");
ensureUserColumn('profile_picture', 'TEXT');

function seedAdmin() {
  const email = 'johnmichaelacut.202400452@gmail.com';
  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin', student_id = CASE WHEN student_id = '2024-00452' THEN NULL ELSE student_id END WHERE id = ?")
      .run(existing.id);
    return;
  }
  db.prepare(`
    INSERT INTO users (name, email, student_id, role, password_hash)
    VALUES (?, ?, ?, 'admin', ?)
  `).run('John Michael G. Acut', email, null, bcrypt.hashSync('OPPai14369', 10));
}
seedAdmin();

/* Sample events (dates are relative to today so the app always has upcoming events).
   Edit these or insert your own rows later. */
function seedEvents() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  if (count > 0) return;

  const pad = (n) => String(n).padStart(2, '0');
  const at = (daysFromNow, hour, min = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(min)}:00`;
  };

  const insert = db.prepare(`
    INSERT INTO events (title, category, banner_text, banner_tagline, tagline, description, date, location, location_note, free)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const events = [
    {
      title: 'School Event', category: 'School',
      banner_text: 'CAMPUS|CONNECT.', banner_tagline: 'MEET. CONNECT. BELONG.',
      tagline: 'A campus moment, together.',
      description: 'Meet fellow students, connect with your school community, and take part in campus activities. Come ready to join in.',
      date: at(7, 8), location: 'SPC', location_note: 'On campus · Iligan City', free: 1
    },
    {
      title: 'Sports Event', category: 'Sports',
      banner_text: 'GAME|ON.', banner_tagline: 'PLAY. CHEER. WIN.',
      tagline: 'Bring your team spirit.',
      description: 'Cheer for your department, join the games, and enjoy a day of friendly competition with fellow students.',
      date: at(14, 13), location: 'SPC CC', location_note: 'Check event for schedule', free: 1
    },
    {
      title: 'Career Seminar', category: 'Seminar',
      banner_text: 'FUTURE|READY.', banner_tagline: 'LEARN FROM THE PROS.',
      tagline: 'Get ready for what comes next.',
      description: 'Hear from industry guests about careers, skills, and how to prepare for life after graduation.',
      date: at(21, 9), location: 'SPC Auditorium', location_note: 'On campus · Iligan City', free: 1
    },
    {
      title: 'Tech Workshop', category: 'Workshop',
      banner_text: 'BUILD|IT.', banner_tagline: 'HANDS-ON. HANDS UP.',
      tagline: 'Learn by doing.',
      description: 'A guided, hands-on workshop where you will build something real. Bring your laptop and your curiosity.',
      date: at(28, 14), location: 'Computer Lab 2', location_note: 'On campus · Iligan City', free: 1
    }
  ];

  db.exec('BEGIN');
  try {
    for (const e of events) {
      insert.run(
        e.title, e.category, e.banner_text, e.banner_tagline, e.tagline,
        e.description, e.date, e.location, e.location_note, e.free
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
seedEvents();

/* ---------- MIDDLEWARE ---------- */
app.use(express.json({ limit: '3mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function readToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), SECRET);
  } catch {
    return null;
  }
}

function optionalAuth(req, _res, next) {
  req.user = readToken(req);
  next();
}

function requireAuth(req, res, next) {
  const user = readToken(req);
  if (!user) return res.status(401).json({ error: 'Please log in again.' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = readToken(req);
  if (!user) return res.status(401).json({ error: 'Please log in again.' });
  const account = db.prepare('SELECT role FROM users WHERE id = ?').get(user.id);
  if (!account || account.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  req.user = user;
  next();
}

function requireStaff(req, res, next) {
  const user = readToken(req);
  if (!user) return res.status(401).json({ error: 'Please log in again.' });
  const account = db.prepare('SELECT role FROM users WHERE id = ?').get(user.id);
  if (!account || !['admin', 'staff'].includes(account.role)) {
    return res.status(403).json({ error: 'Staff access required.' });
  }
  req.user = user;
  next();
}

const signToken = (u) => jwt.sign({ id: u.id, name: u.name, role: u.role }, SECRET, { expiresIn: '30d' });

/* ---------- AUTH ---------- */
app.post('/api/auth/register', (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const studentId = (req.body.studentId || '').trim();
  const password = req.body.password || '';

  if (!name || !email || !studentId || !password) return res.status(400).json({ error: 'Please fill in all fields.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!/^\d{4}-\d{4}$/.test(studentId)) return res.status(400).json({ error: 'Enter an ID with 4 digits, a hyphen, and 4 digits (example: 2024-0452).' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'That email is already registered.' });
  const idExists = db.prepare('SELECT id FROM users WHERE student_id = ?').get(studentId);
  if (idExists) return res.status(409).json({ error: 'That student ID is already registered.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, student_id, password_hash) VALUES (?, ?, ?, ?)').run(name, email, studentId, hash);
  const user = { id: Number(info.lastInsertRowid), name, email, studentId, role: 'student' };
  res.status(201).json({ token: signToken(user), user });
});

app.post('/api/auth/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    studentId: row.student_id,
    role: row.role,
    profilePicture: row.profile_picture
  };
  res.json({ token: signToken(user), user });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, student_id AS studentId, role, profile_picture AS profilePicture FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Please log in again.' });
  res.json(user);
});

app.put('/api/me/profile-picture', requireAuth, (req, res) => {
  const image = req.body.profilePicture;
  if (typeof image !== 'string') {
    return res.status(400).json({ error: 'Choose a PNG or JPG image.' });
  }

  const match = image.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return res.status(400).json({ error: 'Only PNG and JPG images are supported.' });

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image must be 2 MB or smaller.' });
  }

  const isPng = match[1] === 'png' &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = match[1] === 'jpeg' &&
    buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  if (!isPng && !isJpeg) return res.status(400).json({ error: 'The selected file is not a valid PNG or JPG image.' });

  db.prepare('UPDATE users SET profile_picture = ? WHERE id = ?').run(image, req.user.id);
  res.json({ profilePicture: image });
});

/* ---------- EVENTS ---------- */
const eventQuery = `
  SELECT e.*, CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS registered
  FROM events e
  LEFT JOIN registrations r ON r.event_id = e.id AND r.user_id = ?
`;

app.get('/api/events', optionalAuth, (req, res) => {
  const search = (req.query.search || '').trim();
  const category = (req.query.category || '').trim();
  const where = [];
  const params = [req.user ? req.user.id : 0];

  if (search) {
    where.push('(e.title LIKE ? OR e.location LIKE ? OR e.description LIKE ? OR e.category LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (category && category !== 'All') {
    where.push('e.category = ?');
    params.push(category);
  }

  const sql = `${eventQuery} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY e.date ASC`;
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/events/:id', optionalAuth, (req, res) => {
  const event = db
    .prepare(`${eventQuery} WHERE e.id = ?`)
    .get(req.user ? req.user.id : 0, Number(req.params.id));
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  res.json(event);
});

app.post('/api/events/:id/register', requireAuth, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(Number(req.params.id));
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (new Date(event.date) < new Date()) return res.status(400).json({ error: 'This event has already ended.' });

  db.prepare('INSERT OR IGNORE INTO registrations (user_id, event_id) VALUES (?, ?)').run(req.user.id, event.id);
  res.status(201).json({ ok: true, title: event.title });
});

app.delete('/api/events/:id/register', requireAuth, (req, res) => {
  db.prepare('DELETE FROM registrations WHERE user_id = ? AND event_id = ?').run(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/my-events', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT e.*, 1 AS registered, r.created_at AS registered_at
    FROM registrations r
    JOIN events e ON e.id = r.event_id
    WHERE r.user_id = ?
    ORDER BY e.date ASC
  `).all(req.user.id);
  res.json(rows);
});

app.get('/api/admin/registrations', requireStaff, (req, res) => {
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId.trim() : '';
  const search = studentId ? `%${studentId}%` : null;
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.student_id AS studentId,
           u.role,
           COUNT(r.id) AS registrationCount
    FROM users u
    LEFT JOIN registrations r ON r.user_id = u.id
    WHERE (? IS NULL OR u.student_id LIKE ?)
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all(search, search);

  const registrations = db.prepare(`
    SELECT r.id, r.created_at AS registeredAt,
           u.id AS userId, u.name, u.email, u.student_id AS studentId,
           e.id AS eventId, e.title AS eventTitle, e.date AS eventDate, e.location
    FROM registrations r
    JOIN users u ON u.id = r.user_id
    JOIN events e ON e.id = r.event_id
    WHERE (? IS NULL OR u.student_id LIKE ?)
    ORDER BY r.created_at DESC
  `).all(search, search);

  res.json({ users, registrations, studentId });
});

app.put('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const { role } = req.body;
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Invalid account.' });
  }
  if (!['student', 'staff', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Choose Student, Staff, or Admin.' });
  }
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }

  const account = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId);
  if (!account) return res.status(404).json({ error: 'Account not found.' });
  if (account.role === 'admin' && role !== 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count;
    if (adminCount <= 1) return res.status(409).json({ error: 'At least one admin account must remain.' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  res.json({ ok: true, id: userId, role });
});

app.listen(PORT, () => console.log(`Event Ease running on http://localhost:${PORT}`));