# 🏥 MAPSIVE For Your Health — MySQL Edition

> Hospital Management System | Node.js + Express + MySQL
> MNRCET CSE Project | Chisthi

---

## 📁 Project Structure

```
mapsive_mysql/
├── server.js          ← Node.js + Express backend (all API routes)
├── package.json       ← Dependencies
├── database.sql       ← MySQL schema + seed data
├── .env.example       ← Copy to .env and add your MySQL credentials
├── README.md          ← This file
└── public/
    ├── index.html     ← Complete frontend (HTML + CSS + JS)
    └── uploads/       ← Created automatically for file uploads
```

---

## ⚙️ Setup Instructions

### Step 1: Install MySQL
- Download from: https://dev.mysql.com/downloads/installer/
- Create a database user (or use root)

### Step 2: Create Database
```bash
mysql -u root -p < database.sql
```
This creates `mapsive_db` with all tables and sample data.

### Step 3: Install Node.js Dependencies
```bash
npm install
```

### Step 4: Configure Environment
```bash
copy .env.example .env        # Windows
cp .env.example .env          # Linux/Mac
```
Open `.env` and fill in your MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YourPassword
DB_NAME=mapsive_db
PORT=3000
SESSION_SECRET=mapsive_secret_2025
```

### Step 5: Start the Server
```bash
node server.js
```

### Step 6: Open in Browser
```
http://localhost:3000
```

---

## 🗄️ MySQL Tables

| Table         | Purpose                                      |
|---------------|----------------------------------------------|
| hospitals     | Hospital records (name, location, speciality)|
| doctors       | Doctor profiles + login codes                |
| doctor_otp    | OTP sessions for doctor login                |
| appointments  | Patient appointment bookings                 |
| prescriptions | Doctor-written prescriptions                 |
| bills         | Patient billing records                      |
| admin         | Admin login credentials                      |

---

## 🔐 Default Admin Login

| Field    | Value     |
|----------|-----------|
| Username | admin     |
| Password | admin123  |

> Change this after first login!

---

## 🌐 API Endpoints

| Method | Endpoint                          | Description               |
|--------|-----------------------------------|---------------------------|
| GET    | /api/hospitals                    | List/filter hospitals     |
| POST   | /api/hospitals                    | Add hospital (admin)      |
| GET    | /api/doctors                      | List/filter doctors       |
| POST   | /api/doctors/register             | Register doctor           |
| POST   | /api/doctors/send-otp             | Send OTP                  |
| POST   | /api/doctors/verify-otp           | Verify OTP & login        |
| GET    | /api/appointments                 | List appointments         |
| POST   | /api/appointments                 | Book appointment          |
| POST   | /api/appointments/schedule        | Doctor schedules appt     |
| PUT    | /api/appointments/:id/status      | Update status             |
| GET    | /api/prescriptions                | List prescriptions        |
| POST   | /api/prescriptions                | Save prescription         |
| GET    | /api/bills                        | List bills                |
| POST   | /api/bills                        | Save bill                 |
| PUT    | /api/bills/:id/paid               | Mark bill as paid         |
| POST   | /api/admin/login                  | Admin login               |
| GET    | /api/admin/stats                  | Dashboard stats           |
| GET    | /api/admin/doctors                | All doctors (admin)       |
| POST   | /api/admin/doctors                | Add/update doctor         |
| PUT    | /api/admin/doctors/:id/status     | Suspend/activate doctor   |
| GET    | /api/admin/patients               | Patient list              |
| GET    | /api/admin/appointments           | All appointments          |
| GET    | /api/admin/bills                  | All bills                 |

---

## 📦 Dependencies

```json
"express"          : Web framework
"mysql2"           : MySQL driver (with Promise support)
"bcrypt"           : Admin password hashing
"express-session"  : Session management for doctor/admin login
"multer"           : File upload handling (doctor photos, licenses)
"cors"             : Cross-origin requests
"dotenv"           : Environment variables
```

---

## 🚀 Deploy to Render.com (Free)

1. Push code to GitHub
2. Go to https://render.com → New Web Service
3. Connect your repo
4. Set build command: `npm install`
5. Set start command: `node server.js`
6. Add Environment Variables (DB_HOST, DB_USER etc.) → Use Render MySQL or PlanetScale
7. Deploy!

---

*© 2025 MAPSIVE For Your Health | MNRCET CSE*
