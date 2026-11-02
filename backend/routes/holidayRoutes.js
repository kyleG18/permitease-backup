const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { protect, requireRole } = require('../middleware/authMiddleware');

/* ─────────────────────────────────────────────────────────────────
   GET /api/schedule/month?year=YYYY&month=MM
   Public to authenticated users — returns blocked dates for the
   requested month (holidays, special non-working days, BPLO closures).
   Available (Mon-Fri, not blocked) dates are NOT returned — the
   frontend derives them by elimination.
───────────────────────────────────────────────────────────────────*/
router.get('/month', protect, async (req, res) => {
  try {
    const year  = parseInt(req.query.year,  10);
    const month = parseInt(req.query.month, 10);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid year and month (1-12) are required.' });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate   = new Date(year, month, 0); // last day of month
    const endStr    = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const [rows] = await db.query(
      `SELECT schedule_date, day_type, label
       FROM bplo_schedule
       WHERE schedule_date BETWEEN ? AND ?
         AND is_active = 1
       ORDER BY schedule_date ASC`,
      [startDate, endStr]
    );

    // Format dates as YYYY-MM-DD strings
    const formatted = rows.map(r => ({
      date:     typeof r.schedule_date === 'string'
                  ? r.schedule_date.split('T')[0]
                  : r.schedule_date.toISOString().split('T')[0],
      day_type: r.day_type,
      label:    r.label || ''
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[holidayRoutes] /month error:', err);
    res.status(500).json({ message: 'Failed to load schedule data.' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   Admin-only CRUD
───────────────────────────────────────────────────────────────────*/

// POST /api/schedule  — add a blocked date
router.post('/', protect, requireRole(['lgu_admin', 'system_admin']), async (req, res) => {
  const { schedule_date, day_type, label } = req.body;
  if (!schedule_date || !day_type) {
    return res.status(400).json({ message: 'schedule_date and day_type are required.' });
  }
  const validTypes = ['holiday', 'special_nonworking', 'bplo_closed'];
  if (!validTypes.includes(day_type)) {
    return res.status(400).json({ message: `day_type must be one of: ${validTypes.join(', ')}` });
  }
  try {
    await db.query(
      `INSERT INTO bplo_schedule (schedule_date, day_type, label, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE day_type = VALUES(day_type), label = VALUES(label), is_active = 1`,
      [schedule_date, day_type, label || null]
    );
    res.json({ message: 'Schedule entry saved.' });
  } catch (err) {
    console.error('[holidayRoutes] POST error:', err);
    res.status(500).json({ message: 'Failed to save schedule entry.' });
  }
});

// DELETE /api/schedule/:date  — remove a blocked date
router.delete('/:date', protect, requireRole(['lgu_admin', 'system_admin']), async (req, res) => {
  try {
    await db.query(
      `UPDATE bplo_schedule SET is_active = 0 WHERE schedule_date = ?`,
      [req.params.date]
    );
    res.json({ message: 'Schedule entry removed.' });
  } catch (err) {
    console.error('[holidayRoutes] DELETE error:', err);
    res.status(500).json({ message: 'Failed to remove schedule entry.' });
  }
});

module.exports = router;
