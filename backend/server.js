// server.js — Main Express Application Entry Point
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static('../frontend'));

// ─── ROUTES ──────────────────────────────────────────────────
app.use('/api/students',     require('./routes/studentRoutes'));
app.use('/api/skills',       require('./routes/skillRoutes'));
app.use('/api/companies',    require('./routes/companyRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/placements',   require('./routes/placementRoutes'));

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Placement Portal API is running', timestamp: new Date() });
});

// ─── 404 HANDLER ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── START SERVER ────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Placement Portal API running at http://localhost:${PORT}`);
    console.log(`API Docs available at http://localhost:${PORT}/api/health`);
});
