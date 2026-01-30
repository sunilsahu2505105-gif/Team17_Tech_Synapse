const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const remindersRoutes = require('./routes/reminders');
const patientsRoutes = require('./routes/patients');
const visitsRoutes = require('./routes/visits');
const aiRoutes = require('./routes/ai');
const detectRoutes = require('./routes/detect');

const PORT = Number(process.env.PORT || 3000);

async function main() {
  await initDb();

  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'carehub-backend', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/patient', patientRoutes);
  app.use('/api/patient', remindersRoutes);
  app.use('/api/patients', patientsRoutes);
  app.use('/api', visitsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/detect', detectRoutes);

  // Uploaded visit images
  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { fallthrough: false }));

  // Serve frontend assets
  app.use('/static', express.static(path.join(__dirname, 'static'), { fallthrough: false }));

  // Serve known html files from workspace root (prevents exposing package.json, etc.)
  app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

  app.get('/:file', (req, res, next) => {
    const file = String(req.params.file || '');
    if (!file.toLowerCase().endsWith('.html')) return next();

    const safe = path.basename(file);
    const fullPath = path.join(__dirname, safe);
    return res.sendFile(fullPath);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`CareHub backend running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
