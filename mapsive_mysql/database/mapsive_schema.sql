CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE hospitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  location VARCHAR(100),
  speciality VARCHAR(100),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  image_url VARCHAR(255),
  license_url VARCHAR(255),
  rating FLOAT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id VARCHAR(20),
  name VARCHAR(100),
  specialization VARCHAR(100),
  hospital VARCHAR(100),
  location VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100) UNIQUE,
  license VARCHAR(100),
  photo_url VARCHAR(255),
  login_code VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE doctor_otp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100),
  otp VARCHAR(10),
  expires_at DATETIME,
  used BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100),
  patient_phone VARCHAR(20),
  hospital VARCHAR(100),
  doctor_name VARCHAR(100),
  doctor_id VARCHAR(20),
  appointment_date DATE,
  appointment_time TIME,
  visit_type VARCHAR(20),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id VARCHAR(20),
  patient_name VARCHAR(100),
  patient_id VARCHAR(50),
  hospital VARCHAR(100),
  appointment_id INT,
  prescription_txt TEXT,
  notes TEXT,
  referred_doctor VARCHAR(100),
  visit_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100),
  patient_phone VARCHAR(20),
  hospital VARCHAR(100),
  doctor_name VARCHAR(100),
  amount DECIMAL(10,2),
  items TEXT,
  upi_id VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


