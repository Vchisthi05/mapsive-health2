
'use strict';

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const cors     = require('cors');

const app  = express();
const PORT = process.env.PORT || 2005;

// ── Directory & file paths ─────────────────────────────────────────
const DATA_DIR       = path.join(__dirname, 'data');
const DB_FILE        = path.join(DATA_DIR, 'db.json');
const CONTACTS_FILE  = path.join(DATA_DIR, 'contacts.json');
const LOG_FILE       = path.join(DATA_DIR, 'server.log');
const PUBLIC_DIR     = path.join(__dirname, 'public');

// ── Ensure data/ and public/ exist ────────────────────────────────
[DATA_DIR, PUBLIC_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// ── Logger ─────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (_) {}
}

// ── JSON file helpers ──────────────────────────────────────────────
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── Middleware ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(PUBLIC_DIR));

// Log every API request
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) log(`${req.method} ${req.path}`);
  next();
});

// ====================================================================
//   API ROUTES
// ====================================================================

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── Generic Key-Value Store (mirrors localStorage) ─────────────────
// GET all stored keys
app.get('/api/store', (_req, res) => {
  res.json(readJSON(DB_FILE, {}));
});

// GET single key
app.get('/api/store/:key', (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const db  = readJSON(DB_FILE, {});
  if (Object.prototype.hasOwnProperty.call(db, key)) {
    res.json({ key, value: db[key] });
  } else {
    res.status(404).json({ error: 'Key not found' });
  }
});

// POST – set a key
app.post('/api/store', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required' });
  const db = readJSON(DB_FILE, {});
  db[key]  = value;
  writeJSON(DB_FILE, db);
  res.json({ success: true, key });
});

// DELETE – remove a key
app.delete('/api/store/:key', (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const db  = readJSON(DB_FILE, {});
  delete db[key];
  writeJSON(DB_FILE, db);
  res.json({ success: true, key });
});

// ── Admin Login ────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USER = process.env.ADMIN_USER ;
  const ADMIN_PASS = process.env.ADMIN_PASS ;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    log(`Admin login OK: ${username}`);
    res.json({ success: true });
  } else {
    log(`Admin login FAILED: ${username}`);
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// ── Doctor Registration ────────────────────────────────────────────
app.post('/api/doctor/register', (req, res) => {
  const { name, email, phone, spec, license, pass } = req.body;
  if (!name || !email || !phone || !spec || !license || !pass)
    return res.status(400).json({ error: 'All fields are required' });
  const db  = readJSON(DB_FILE, {});
  const doc = { name, email, phone, spec, license, pass };
  db['doctor_' + email] = JSON.stringify(doc);
  db['doctor_' + phone] = JSON.stringify(doc);
  writeJSON(DB_FILE, db);
  log(`Doctor registered: ${name} (${email})`);
  res.json({ success: true });
});

// ── Doctor Lookup (for OTP login) ─────────────────────────────────
app.post('/api/doctor/lookup', (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'identifier required' });
  const db  = readJSON(DB_FILE, {});
  const raw = db['doctor_' + identifier];
  if (!raw) return res.status(404).json({ error: 'Doctor not found' });
  try {
    res.json({ success: true, doctor: JSON.parse(raw) });
  } catch (_) {
    res.status(500).json({ error: 'Corrupted record' });
  }
});

// ── Appointments ───────────────────────────────────────────────────
app.get('/api/appointments', (_req, res) => {
  const db = readJSON(DB_FILE, {});
  try { res.json(JSON.parse(db['appointments'] || '[]')); }
  catch (_) { res.json([]); }
});

app.post('/api/appointments', (req, res) => {
  const appt = req.body;
  if (!appt.patient || !appt.hospital || !appt.doctor || !appt.date || !appt.time)
    return res.status(400).json({ error: 'Missing required fields' });
  const db   = readJSON(DB_FILE, {});
  const list = (() => { try { return JSON.parse(db['appointments'] || '[]'); } catch(_){return [];} })();
  appt.id        = Date.now();
  appt.completed = false;
  appt.createdAt = new Date().toISOString();
  list.push(appt);
  db['appointments'] = JSON.stringify(list);
  writeJSON(DB_FILE, db);
  log(`Appointment: ${appt.patient} → ${appt.doctor} on ${appt.date}`);
  res.json({ success: true, appointment: appt });
});

app.delete('/api/appointments/:id', (req, res) => {
  const id   = Number(req.params.id);
  const db   = readJSON(DB_FILE, {});
  const list = (() => { try { return JSON.parse(db['appointments'] || '[]'); } catch(_){return [];} })();
  db['appointments'] = JSON.stringify(list.filter(a => a.id !== id));
  writeJSON(DB_FILE, db);
  res.json({ success: true });
});

// ── Bills ──────────────────────────────────────────────────────────
app.get('/api/bills', (_req, res) => {
  const db = readJSON(DB_FILE, {});
  try { res.json(JSON.parse(db['bills'] || '[]')); }
  catch (_) { res.json([]); }
});

app.post('/api/bills', (req, res) => {
  const bill = req.body;
  if (!bill.patient || !bill.billId || !bill.amount)
    return res.status(400).json({ error: 'patient, billId and amount required' });
  const db   = readJSON(DB_FILE, {});
  const list = (() => { try { return JSON.parse(db['bills'] || '[]'); } catch(_){return [];} })();
  bill.createdAt = new Date().toLocaleString('en-IN');
  list.push(bill);
  db['bills'] = JSON.stringify(list);
  writeJSON(DB_FILE, db);
  log(`Bill: ${bill.patient} ₹${bill.amount}`);
  res.json({ success: true, bill });
});

// ── Prescriptions ──────────────────────────────────────────────────
app.get('/api/prescriptions', (_req, res) => {
  const db = readJSON(DB_FILE, {});
  try { res.json(JSON.parse(db['prescriptions'] || '{}')); }
  catch (_) { res.json({}); }
});

// ── Contact Form ───────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message required' });
  const contacts = readJSON(CONTACTS_FILE, []);
  contacts.push({ name, email, phone, message, timestamp: new Date().toISOString() });
  writeJSON(CONTACTS_FILE, contacts);
  log(`Contact from: ${name}`);
  res.json({ success: true });
});

// ── Stats ──────────────────────────────────────────────────────────
app.get('/api/stats', (_req, res) => {
  const db   = readJSON(DB_FILE, {});
  const appt = (() => { try { return JSON.parse(db['appointments'] || '[]'); } catch(_){return [];} })();
  const bill = (() => { try { return JSON.parse(db['bills'] || '[]'); } catch(_){return [];} })();
  const xh   = (() => { try { return JSON.parse(db['hospitals'] || '[]'); } catch(_){return [];} })();
  const xd   = (() => { try { return JSON.parse(db['doctors'] || '[]'); } catch(_){return [];} })();
  res.json({
    appointments:   appt.length,
    bills:          bill.length,
    extraHospitals: xh.length,
    extraDoctors:   xd.length,
    totalRevenue:   bill.reduce((s, b) => s + Number(b.amount || 0), 0)
  });
});

// ── Serve frontend for all non-API routes ──────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ====================================================================
//   START
// ====================================================================
app.listen(PORT, () => {
  log(`  MAPSIVE Health Backend running at http://localhost:${PORT}`);
});
