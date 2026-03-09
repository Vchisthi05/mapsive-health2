// ============================================================
//  MAPSIVE For Your Health — Node.js + Express + MySQL Server
//  Author : Chisthi | MNRCET CSE
//  Run    : node server.js  (after: npm install)
// ============================================================

require('dotenv').config();
const express  = require('express');
const mysql    = require('mysql2/promise');
const bcrypt   = require('bcrypt');
const session  = require('express-session');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Upload Storage ─────────────────────────────────────────
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'mapsive_2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ── MySQL Connection Pool ───────────────────────────────────
const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            process.env.DB_PORT     || 3306,
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASSWORD || '',
  database:        process.env.DB_NAME     || 'mapsive_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit:      0
});

// Test DB connection
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully!');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Check your .env DB credentials and ensure MySQL is running.');
  }
})();

// ── Helper ─────────────────────────────────────────────────
function genDoctorId() {
  return 'DOC' + Date.now().toString().slice(-6);
}
function genLoginCode() {
  return 'LC' + Math.random().toString(36).substring(2, 8).toUpperCase();
}
function genOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ════════════════════════════════════════════════════════════
//  HOSPITALS
// ════════════════════════════════════════════════════════════

// GET  /api/hospitals  — list all or filter
app.get('/api/hospitals', async (req, res) => {
  try {
    const { location, speciality, search } = req.query;
    let sql    = 'SELECT * FROM hospitals WHERE status = "active"';
    const params = [];

    if (location && location !== 'all') {
      sql += ' AND location = ?';
      params.push(location);
    }
    if (speciality && speciality !== 'all') {
      sql += ' AND speciality = ?';
      params.push(speciality);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY rating DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/hospitals  — add hospital (admin)
app.post('/api/hospitals', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'license', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin login required' });

    const { name, location, speciality, address, phone, email } = req.body;
    if (!name || !location || !speciality)
      return res.status(400).json({ success: false, message: 'name, location, speciality required' });

    const photo_url   = req.files?.photo?.[0]   ? '/uploads/' + req.files.photo[0].filename   : null;
    const license_url = req.files?.license?.[0] ? '/uploads/' + req.files.license[0].filename : null;

    const [result] = await pool.query(
      'INSERT INTO hospitals (name, location, speciality, address, phone, email, image_url, license_url) VALUES (?,?,?,?,?,?,?,?)',
      [name, location, speciality, address || '', phone || '', email || '', photo_url, license_url]
    );
    res.json({ success: true, id: result.insertId, message: 'Hospital registered' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/hospitals/:id
app.delete('/api/hospitals/:id', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });
    await pool.query('UPDATE hospitals SET status="suspended" WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Hospital removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  DOCTORS
// ════════════════════════════════════════════════════════════

// GET /api/doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const { location, search } = req.query;
    let sql    = 'SELECT * FROM doctors WHERE status="active"';
    const params = [];
    if (location && location !== 'all') {
      sql += ' AND location = ?';
      params.push(location);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR specialization LIKE ? OR hospital LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY name ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/doctors/register
app.post('/api/doctors/register', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'license_doc', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, specialization, hospital, location, phone, email, license } = req.body;
    if (!name || !specialization || !email)
      return res.status(400).json({ success: false, message: 'name, specialization, email required' });

    const [existing] = await pool.query('SELECT id FROM doctors WHERE email=?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const doctor_id  = genDoctorId();
    const login_code = genLoginCode();
    const photo_url  = req.files?.photo?.[0] ? '/uploads/' + req.files.photo[0].filename : null;

    await pool.query(
      'INSERT INTO doctors (doctor_id, name, specialization, hospital, location, phone, email, license, photo_url, login_code) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [doctor_id, name, specialization, hospital || '', location || '', phone || '', email, license || '', photo_url, login_code]
    );
    res.json({ success: true, doctor_id, login_code, message: 'Doctor registered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/doctors/send-otp
app.post('/api/doctors/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const [docs] = await pool.query('SELECT * FROM doctors WHERE email=? AND status="active"', [email]);
    if (docs.length === 0)
      return res.status(404).json({ success: false, message: 'Doctor not found or suspended' });

    const otp      = genOTP();
    const expires  = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await pool.query(
      'INSERT INTO doctor_otp (email, otp, expires_at) VALUES (?,?,?)',
      [email, otp, expires]
    );

    // In production: send via SMS/email. For demo: return in response
    console.log(`📱 OTP for ${email}: ${otp}`);
    res.json({ success: true, message: 'OTP sent (check server console in demo mode)', otp_demo: otp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/doctors/verify-otp
app.post('/api/doctors/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, message: 'Email and OTP required' });

    const [rows] = await pool.query(
      'SELECT * FROM doctor_otp WHERE email=? AND otp=? AND used=0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [email, otp]
    );
    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });

    await pool.query('UPDATE doctor_otp SET used=1 WHERE id=?', [rows[0].id]);

    const [docs] = await pool.query('SELECT * FROM doctors WHERE email=?', [email]);
    const doc = docs[0];

    req.session.doctorLoggedIn = true;
    req.session.doctorId       = doc.doctor_id;
    req.session.doctorEmail    = doc.email;

    res.json({ success: true, message: 'Login successful', doctor: {
      doctor_id:      doc.doctor_id,
      name:           doc.name,
      email:          doc.email,
      phone:          doc.phone,
      specialization: doc.specialization,
      hospital:       doc.hospital,
      license:        doc.license
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/doctors/me — get logged-in doctor info
app.get('/api/doctors/me', async (req, res) => {
  if (!req.session.doctorLoggedIn)
    return res.status(401).json({ success: false, message: 'Not logged in' });
  try {
    const [rows] = await pool.query('SELECT * FROM doctors WHERE doctor_id=?', [req.session.doctorId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Doctor not found' });
    res.json({ success: true, doctor: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/doctors/logout
app.post('/api/doctors/logout', (req, res) => {
  req.session.doctorLoggedIn = false;
  req.session.doctorId       = null;
  res.json({ success: true, message: 'Logged out' });
});

// ════════════════════════════════════════════════════════════
//  APPOINTMENTS
// ════════════════════════════════════════════════════════════

// GET /api/appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const { doctor_id, date, status } = req.query;
    let sql    = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];
    if (doctor_id) { sql += ' AND doctor_id=?';         params.push(doctor_id); }
    if (date)      { sql += ' AND appointment_date=?';  params.push(date);      }
    if (status)    { sql += ' AND status=?';            params.push(status);    }
    sql += ' ORDER BY appointment_date DESC, appointment_time DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments
app.post('/api/appointments', async (req, res) => {
  try {
    const { patient_name, patient_phone, hospital, doctor_name, doctor_id,
            appointment_date, appointment_time, visit_type, notes } = req.body;

    if (!patient_name || !appointment_date || !appointment_time)
      return res.status(400).json({ success: false, message: 'patient_name, date, time required' });

    const [result] = await pool.query(
      'INSERT INTO appointments (patient_name, patient_phone, hospital, doctor_name, doctor_id, appointment_date, appointment_time, visit_type, notes) VALUES (?,?,?,?,?,?,?,?,?)',
      [patient_name, patient_phone || '', hospital || '', doctor_name || '', doctor_id || '',
       appointment_date, appointment_time, visit_type || 'Offline', notes || '']
    );
    res.json({ success: true, id: result.insertId, message: 'Appointment booked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id/status
app.put('/api/appointments/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE appointments SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments/:id/schedule
app.post('/api/appointments/schedule', async (req, res) => {
  try {
    if (!req.session.doctorLoggedIn)
      return res.status(401).json({ success: false, message: 'Doctor login required' });

    const { patient_name, patient_phone, hospital, appointment_date,
            appointment_time, visit_type, notes } = req.body;

    const [result] = await pool.query(
      'INSERT INTO appointments (patient_name, patient_phone, hospital, doctor_id, appointment_date, appointment_time, visit_type, notes) VALUES (?,?,?,?,?,?,?,?)',
      [patient_name, patient_phone || '', hospital || '', req.session.doctorId,
       appointment_date, appointment_time, visit_type || 'Offline', notes || '']
    );
    res.json({ success: true, id: result.insertId, message: 'Appointment scheduled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  PRESCRIPTIONS
// ════════════════════════════════════════════════════════════

// GET /api/prescriptions
app.get('/api/prescriptions', async (req, res) => {
  try {
    const doctor_id = req.query.doctor_id || req.session.doctorId;
    if (!doctor_id) return res.status(400).json({ success: false, message: 'doctor_id required' });
    const [rows] = await pool.query(
      'SELECT * FROM prescriptions WHERE doctor_id=? ORDER BY created_at DESC', [doctor_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/prescriptions
app.post('/api/prescriptions', async (req, res) => {
  try {
    if (!req.session.doctorLoggedIn)
      return res.status(401).json({ success: false, message: 'Doctor login required' });

    const { patient_name, patient_id, hospital, appointment_id,
            prescription_txt, notes, referred_doctor, visit_type } = req.body;

    const [result] = await pool.query(
      'INSERT INTO prescriptions (doctor_id, patient_name, patient_id, hospital, appointment_id, prescription_txt, notes, referred_doctor, visit_type) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.session.doctorId, patient_name || '', patient_id || '',
       hospital || '', appointment_id || null, prescription_txt || '',
       notes || '', referred_doctor || '', visit_type || '']
    );

    // Mark appointment completed if provided
    if (appointment_id) {
      await pool.query('UPDATE appointments SET status="completed" WHERE id=?', [appointment_id]);
    }

    res.json({ success: true, id: result.insertId, message: 'Prescription saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  BILLING
// ════════════════════════════════════════════════════════════

// GET /api/bills
app.get('/api/bills', async (req, res) => {
  try {
    const { patient_phone, patient_name } = req.query;
    let sql    = 'SELECT * FROM bills WHERE 1=1';
    const params = [];
    if (patient_phone) { sql += ' AND patient_phone=?'; params.push(patient_phone); }
    if (patient_name)  { sql += ' AND patient_name LIKE ?'; params.push(`%${patient_name}%`); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bills
app.post('/api/bills', async (req, res) => {
  try {
    const { patient_name, patient_phone, hospital, doctor_name, amount, items, upi_id } = req.body;
    if (!patient_name || !amount)
      return res.status(400).json({ success: false, message: 'patient_name and amount required' });

    const [result] = await pool.query(
      'INSERT INTO bills (patient_name, patient_phone, hospital, doctor_name, amount, items, upi_id) VALUES (?,?,?,?,?,?,?)',
      [patient_name, patient_phone || '', hospital || '', doctor_name || '',
       parseFloat(amount) || 0, items ? JSON.stringify(items) : '', upi_id || '']
    );
    res.json({ success: true, id: result.insertId, message: 'Bill saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/bills/:id/paid
app.put('/api/bills/:id/paid', async (req, res) => {
  try {
    await pool.query('UPDATE bills SET payment_status="paid" WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Bill marked as paid' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  ADMIN
// ════════════════════════════════════════════════════════════

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM admin WHERE username=?', [username]);
    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    req.session.adminLoggedIn = true;
    res.json({ success: true, message: 'Admin logged in' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/logout
app.post('/api/admin/logout', (req, res) => {
  req.session.adminLoggedIn = false;
  res.json({ success: true, message: 'Admin logged out' });
});

// GET /api/admin/stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });

    const [[hCount]]  = await pool.query('SELECT COUNT(*) AS c FROM hospitals WHERE status="active"');
    const [[dTotal]]  = await pool.query('SELECT COUNT(*) AS c FROM doctors');
    const [[dActive]] = await pool.query('SELECT COUNT(*) AS c FROM doctors WHERE status="active"');
    const [[dSusp]]   = await pool.query('SELECT COUNT(*) AS c FROM doctors WHERE status="suspended"');
    const [[aCount]]  = await pool.query('SELECT COUNT(*) AS c FROM appointments');
    const [[bCount]]  = await pool.query('SELECT COUNT(*) AS c FROM bills');

    res.json({ success: true, stats: {
      hospitals:           hCount.c,
      doctors_total:       dTotal.c,
      doctors_active:      dActive.c,
      doctors_suspended:   dSusp.c,
      appointments:        aCount.c,
      bills:               bCount.c
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/doctors — all doctors for admin
app.get('/api/admin/doctors', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });
    const [rows] = await pool.query('SELECT * FROM doctors ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/doctors  — admin adds/updates doctor
app.post('/api/admin/doctors', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'license_doc', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });

    const { name, specialization, hospital, location, phone, email, license } = req.body;
    if (!name || !specialization || !email)
      return res.status(400).json({ success: false, message: 'name, specialization, email required' });

    const photo_url   = req.files?.photo?.[0]       ? '/uploads/' + req.files.photo[0].filename       : null;
    const license_url = req.files?.license_doc?.[0] ? '/uploads/' + req.files.license_doc[0].filename : null;

    const [existing] = await pool.query('SELECT id FROM doctors WHERE email=?', [email]);
    if (existing.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE doctors SET name=?, specialization=?, hospital=?, location=?, phone=?, license=? WHERE email=?',
        [name, specialization, hospital || '', location || '', phone || '', license || '', email]
      );
      if (photo_url)   await pool.query('UPDATE doctors SET photo_url=?   WHERE email=?', [photo_url,   email]);
      if (license_url) await pool.query('UPDATE doctors SET license=?     WHERE email=?', [license_url, email]);
      return res.json({ success: true, message: 'Doctor updated' });
    }

    const doctor_id  = genDoctorId();
    const login_code = genLoginCode();
    await pool.query(
      'INSERT INTO doctors (doctor_id, name, specialization, hospital, location, phone, email, license, photo_url, login_code) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [doctor_id, name, specialization, hospital || '', location || '', phone || '', email, license || '', photo_url, login_code]
    );
    res.json({ success: true, doctor_id, login_code, message: 'Doctor created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/doctors/:id/status
app.put('/api/admin/doctors/:id/status', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });
    const { status } = req.body;
    await pool.query('UPDATE doctors SET status=? WHERE doctor_id=?', [status, req.params.id]);
    res.json({ success: true, message: `Doctor ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/patients
app.get('/api/admin/patients', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });
    const [rows] = await pool.query(
      'SELECT DISTINCT patient_name, patient_phone, hospital, COUNT(*) AS visits FROM appointments GROUP BY patient_name, patient_phone, hospital ORDER BY visits DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/appointments
app.get('/api/admin/appointments', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });
    const [rows] = await pool.query('SELECT * FROM appointments ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/bills
app.get('/api/admin/bills', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });
    const [rows] = await pool.query('SELECT * FROM bills ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/hospitals
app.get('/api/admin/hospitals', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn)
      return res.status(401).json({ success: false, message: 'Admin required' });
    const [rows] = await pool.query('SELECT * FROM hospitals ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SPA fallback ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥 MAPSIVE Server running at http://localhost:${PORT}`);
  console.log(`📋 API Base: http://localhost:${PORT}/api`);
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'mapsive_db'} @ ${process.env.DB_HOST || 'localhost'}\n`);
});
