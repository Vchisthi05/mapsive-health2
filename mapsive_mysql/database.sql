-- ============================================================
--  MAPSIVE For Your Health — MySQL Database Schema
--  Run this file in MySQL: mysql -u root -p < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS mapsive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mapsive_db;

-- ─────────────────────────────────────────────────────────────
--  TABLE: hospitals
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitals (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    location      VARCHAR(100) NOT NULL,
    speciality    VARCHAR(100) NOT NULL,
    address       VARCHAR(300),
    phone         VARCHAR(20),
    email         VARCHAR(100),
    rating        DECIMAL(2,1) DEFAULT 4.0,
    image_url     VARCHAR(500),
    license_url   VARCHAR(500),
    status        ENUM('active','suspended') DEFAULT 'active',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
--  TABLE: doctors
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id      VARCHAR(20) UNIQUE NOT NULL,
    name           VARCHAR(150) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    hospital       VARCHAR(200),
    location       VARCHAR(100),
    phone          VARCHAR(20),
    email          VARCHAR(100) UNIQUE,
    license        VARCHAR(100),
    photo_url      VARCHAR(500),
    login_code     VARCHAR(20),
    status         ENUM('active','suspended') DEFAULT 'active',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
--  TABLE: doctor_otp  (OTP sessions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_otp (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    email        VARCHAR(100) NOT NULL,
    otp          VARCHAR(10)  NOT NULL,
    expires_at   DATETIME     NOT NULL,
    used         TINYINT(1)   DEFAULT 0,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
--  TABLE: appointments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    patient_name     VARCHAR(150) NOT NULL,
    patient_phone    VARCHAR(20),
    hospital         VARCHAR(200),
    doctor_name      VARCHAR(150),
    doctor_id        VARCHAR(20),
    appointment_date DATE         NOT NULL,
    appointment_time TIME         NOT NULL,
    visit_type       ENUM('Offline','Online','Referred') DEFAULT 'Offline',
    status           ENUM('pending','completed','cancelled') DEFAULT 'pending',
    notes            TEXT,
    referred_doctor  VARCHAR(150),
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
--  TABLE: prescriptions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id        VARCHAR(20),
    patient_name     VARCHAR(150),
    patient_id       VARCHAR(30),
    hospital         VARCHAR(200),
    appointment_id   INT,
    prescription_txt TEXT,
    notes            TEXT,
    referred_doctor  VARCHAR(150),
    visit_type       VARCHAR(30),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
--  TABLE: bills
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    patient_name    VARCHAR(150) NOT NULL,
    patient_phone   VARCHAR(20),
    hospital        VARCHAR(200),
    doctor_name     VARCHAR(150),
    amount          DECIMAL(10,2) DEFAULT 0.00,
    items           TEXT,
    upi_id          VARCHAR(100),
    payment_status  ENUM('pending','paid','failed') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
--  TABLE: admin
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
--  SEED DATA — Default Admin (password: admin123)
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO admin (username, password_hash)
VALUES ('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh72');

-- ─────────────────────────────────────────────────────────────
--  SEED DATA — Sample Hospitals
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO hospitals (name, location, speciality, address, phone, rating) VALUES
('Yashoda Hospitals',           'Hyderabad',    'Cardiology',        'Somajiguda, Hyderabad',                  '040-45674567', 4.8),
('Apollo Hospitals',            'Hyderabad',    'Neurology',         'Jubilee Hills, Hyderabad',               '040-23607777', 4.9),
('KIMS Hospitals',              'Hyderabad',    'Orthopedics',       'Minister Road, Secunderabad',            '040-44885000', 4.7),
('Aware Global Hospitals',      'Hyderabad',    'Cardiology',        'LB Nagar, Hyderabad',                    '040-39999000', 4.6),
('MaxCure Hospitals',           'Hyderabad',    'Oncology',          'Madhapur, Hyderabad',                    '040-48486868', 4.5),
('Star Hospitals',              'Hyderabad',    'Gastroenterology',  'Banjara Hills, Hyderabad',               '040-44777000', 4.6),
('Nizams Institute (NIMS)',     'Hyderabad',    'General Medicine',  'Punjagutta, Hyderabad',                  '040-23489000', 4.7),
('Care Hospitals',              'Hyderabad',    'Nephrology',        'Film Nagar, Hyderabad',                  '040-30419999', 4.6),
('Sunshine Hospitals',          'Hyderabad',    'Orthopedics',       'Penderghast Road, Secunderabad',         '040-44558855', 4.5),
('Continental Hospitals',       'Hyderabad',    'Brain / Neurosurgery','Gachibowli, Hyderabad',               '040-67000111', 4.7),
('Medicover Hospitals',         'Hyderabad',    'Gynecology',        'Hitech City, Hyderabad',                 '040-68106810', 4.6),
('Global Hospitals',            'Hyderabad',    'Urology',           'Lakdi-ka-Pool, Hyderabad',               '040-30244000', 4.5),
('Aster Prime Hospital',        'Hyderabad',    'ENT',               'Ameerpet, Hyderabad',                    '040-44555000', 4.4),
('LV Prasad Eye Institute',     'Hyderabad',    'Ophthalmology',     'Banjara Hills, Hyderabad',               '040-30612000', 4.9),
('Renova Hospitals',            'Secunderabad', 'Dermatology',       'SD Road, Secunderabad',                  '040-27803300', 4.3),
('Seven Hills Hospital',        'Secunderabad', 'General Medicine',  'Rocklands, Secunderabad',                '040-27741414', 4.4),
('MNR Hospital',                'Sangareddy',   'General Medicine',  'Sangareddy Town, Sangareddy',            '08452-220055', 4.5),
('District Hospital Sangareddy','Sangareddy',   'Gynecology',        'Collector Office Road, Sangareddy',      '08452-222033', 4.2),
('Srinivasa Hospital',          'Sangareddy',   'Orthopedics',       'Bus Stand Road, Sangareddy',             '08452-221100', 4.3),
('Govt District Hospital Medak','Medak',        'General Medicine',  'Hospital Road, Medak',                   '08452-242100', 4.1),
('Medak Christian Hospital',    'Medak',        'Pediatrics',        'Cathedral Road, Medak',                  '08452-240023', 4.4),
('Jogipet Primary Health',      'Jogipet',      'General Medicine',  'Main Road, Jogipet',                     '08455-252100', 4.0),
('Patancheruvu General Hosp',   'Patancheruvu', 'General Medicine',  'IDA Phase 1, Patancheruvu',              '040-23090100', 4.1);

-- ─────────────────────────────────────────────────────────────
--  SEED DATA — Sample Doctors
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO doctors (doctor_id, name, specialization, hospital, location, phone, email, login_code, status) VALUES
('DOC001','Dr. Ramesh Kumar',     'Cardiology',       'Yashoda Hospitals',          'Hyderabad',    '9848012345','ramesh@yashoda.com',  'LC001','active'),
('DOC002','Dr. Priya Sharma',     'Neurology',        'Apollo Hospitals',            'Hyderabad',    '9848023456','priya@apollo.com',    'LC002','active'),
('DOC003','Dr. Suresh Reddy',     'Orthopedics',      'KIMS Hospitals',              'Secunderabad', '9848034567','suresh@kims.com',     'LC003','active'),
('DOC004','Dr. Anjali Rao',       'Gynecology',       'Medicover Hospitals',         'Hyderabad',    '9848045678','anjali@medicover.com','LC004','active'),
('DOC005','Dr. Venkatesh Naidu',  'Gastroenterology', 'Star Hospitals',              'Hyderabad',    '9848056789','venkat@star.com',     'LC005','active'),
('DOC006','Dr. Lakshmi Devi',     'Pediatrics',       'Medak Christian Hospital',    'Medak',        '9848067890','lakshmi@medak.com',   'LC006','active'),
('DOC007','Dr. Kiran Tej',        'Oncology',         'MaxCure Hospitals',           'Hyderabad',    '9848078901','kiran@maxcure.com',   'LC007','active'),
('DOC008','Dr. Sravani Goud',     'Nephrology',       'Care Hospitals',              'Hyderabad',    '9848089012','sravani@care.com',    'LC008','active'),
('DOC009','Dr. Mahesh Babu',      'General Medicine', 'MNR Hospital',                'Sangareddy',   '9848090123','mahesh@mnr.com',      'LC009','active'),
('DOC010','Dr. Padmavathi',       'Ophthalmology',    'LV Prasad Eye Institute',     'Hyderabad',    '9848001234','padma@lvpei.com',     'LC010','active'),
('DOC011','Dr. Arjun Varma',      'ENT',              'Aster Prime Hospital',        'Hyderabad',    '9847112345','arjun@aster.com',     'LC011','active'),
('DOC012','Dr. Neeraja Rao',      'Dermatology',      'Renova Hospitals',            'Secunderabad', '9847223456','neeraja@renova.com',  'LC012','active'),
('DOC013','Dr. Ravi Teja',        'Brain / Neurosurgery','Continental Hospitals',   'Hyderabad',    '9847334567','ravi@continental.com','LC013','active'),
('DOC014','Dr. Sailaja Rani',     'Urology',          'Global Hospitals',            'Hyderabad',    '9847445678','sailaja@global.com',  'LC014','active'),
('DOC015','Dr. Pavan Kalyan',     'Cardiology',       'Aware Global Hospitals',      'Hyderabad',    '9847556789','pavan@aware.com',     'LC015','active');

-- ─────────────────────────────────────────────────────────────
--  Done!
-- ─────────────────────────────────────────────────────────────
SELECT 'Database setup complete!' AS Status;
SELECT COUNT(*) AS Total_Hospitals FROM hospitals;
SELECT COUNT(*) AS Total_Doctors   FROM doctors;
