const path = require('path');
const fs = require('fs');

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let dbPromise;

function ensureDataDir() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

async function getDb() {
  if (!dbPromise) {
    const dataDir = ensureDataDir();
    const dbPath = path.join(dataDir, 'carehub.sqlite');

    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }

  return dbPromise;
}

async function initDb() {
  const db = await getDb();

  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS caregivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      aadhaar TEXT NOT NULL,
      experience_years INTEGER NOT NULL,
      specialization TEXT,
      city TEXT,
      languages TEXT,
      shift TEXT,
      reg_no TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      patient_identifier TEXT NOT NULL UNIQUE,
      patient_phone TEXT NOT NULL,
      aadhaar TEXT,
      photo_path TEXT,
      photo_hash TEXT,
      photo_blob BLOB,
      photo_mime TEXT,
      photo_hash_ahash TEXT,
      photo_hash_dhash TEXT,
      photo_hash_phash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caregiver_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      visit_date TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      location_lat REAL NOT NULL,
      location_lng REAL NOT NULL,
      location_address TEXT NOT NULL,
      vitals_json TEXT NOT NULL,
      checklist_json TEXT NOT NULL,
      detection_json TEXT NOT NULL DEFAULT '{}',
      findings TEXT NOT NULL,
      image_path TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (caregiver_id) REFERENCES caregivers(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_visits_caregiver_date ON visits(caregiver_id, visit_date);

    CREATE TABLE IF NOT EXISTS medication_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      med_name TEXT NOT NULL,
      time_of_day TEXT NOT NULL,
      notes TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_med_rem_patient ON medication_reminders(patient_id);

    CREATE TABLE IF NOT EXISTS test_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      test_name TEXT NOT NULL,
      due_at TEXT NOT NULL,
      notes TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_test_rem_patient_due ON test_reminders(patient_id, due_at);
  `);

  async function ensureVisitColumn(name, sqlTypeAndDefault) {
    const cols = await db.all('PRAGMA table_info(visits)');
    const has = cols.some((c) => String(c.name).toLowerCase() === String(name).toLowerCase());
    if (has) return;
    await db.exec(`ALTER TABLE visits ADD COLUMN ${name} ${sqlTypeAndDefault};`);
  }

  // Backward-compatible migration for older local DBs
  await ensureVisitColumn('checked_at', 'TEXT');
  await ensureVisitColumn('location_lat', 'REAL NOT NULL DEFAULT 0');
  await ensureVisitColumn('location_lng', 'REAL NOT NULL DEFAULT 0');
  await ensureVisitColumn('location_address', "TEXT NOT NULL DEFAULT ''");
  await ensureVisitColumn('vitals_json', "TEXT NOT NULL DEFAULT '{}' ");
  await ensureVisitColumn('checklist_json', "TEXT NOT NULL DEFAULT '{}' ");
  await ensureVisitColumn('detection_json', "TEXT NOT NULL DEFAULT '{}' ");
  await ensureVisitColumn('findings', "TEXT NOT NULL DEFAULT ''");
  await ensureVisitColumn('image_path', "TEXT NOT NULL DEFAULT ''");

  // Backfill newly added columns where needed
  await db.run("UPDATE visits SET checked_at = datetime('now') WHERE checked_at IS NULL OR checked_at = ''");

  async function ensurePatientColumn(name, sqlTypeAndDefault) {
    const cols = await db.all('PRAGMA table_info(patients)');
    const has = cols.some((c) => String(c.name).toLowerCase() === String(name).toLowerCase());
    if (has) return;
    await db.exec(`ALTER TABLE patients ADD COLUMN ${name} ${sqlTypeAndDefault};`);
  }

  // Backward-compatible migration for older DBs
  await ensurePatientColumn('aadhaar', "TEXT NOT NULL DEFAULT ''");
  await ensurePatientColumn('photo_path', "TEXT NOT NULL DEFAULT ''");
  await ensurePatientColumn('photo_hash', "TEXT NOT NULL DEFAULT ''");

  // Newer patient photo storage + stronger verification hashes
  await ensurePatientColumn('photo_blob', 'BLOB');
  await ensurePatientColumn('photo_mime', "TEXT NOT NULL DEFAULT ''");
  await ensurePatientColumn('photo_hash_ahash', "TEXT NOT NULL DEFAULT ''");
  await ensurePatientColumn('photo_hash_dhash', "TEXT NOT NULL DEFAULT ''");
  await ensurePatientColumn('photo_hash_phash', "TEXT NOT NULL DEFAULT ''");

  return db;
}

module.exports = { getDb, initDb };
