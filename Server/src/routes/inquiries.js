const { Router } = require('express');
const { randomUUID } = require('crypto');

const router = Router();
const inquiries = [];

router.post('/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  const item = {
    id: randomUUID(),
    type: 'contact',
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  };
  inquiries.unshift(item);
  res.status(201).json({ ok: true, item });
});

router.post('/partner', (req, res) => {
  const { name, email, phone, location, details } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  const item = {
    id: randomUUID(),
    type: 'partner',
    name,
    email,
    phone: phone || null,
    location: location || null,
    details: details || null,
    createdAt: new Date().toISOString(),
  };
  inquiries.unshift(item);
  res.status(201).json({ ok: true, item });
});

module.exports = router;
