const { Router } = require('express');
const { getAdminCredentials } = require('../middleware/adminAuth');
const { findGuestByEmail, createGuest, findGuestById } = require('../lib/cmsStore');

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function isAdminEmail(email) {
  return (
    String(email || '')
      .toLowerCase()
      .trim() === getAdminCredentials().email
  );
}

router.post(
  '/sign-up',
  wrap(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (isAdminEmail(email)) {
      return res.status(403).json({ error: 'Use the admin sign-in for this account' });
    }
    const user = await createGuest({ name, email, password });
    const token = `prime_${user.id}`;
    res.status(201).json({ user, token });
  })
);

router.post(
  '/sign-in',
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (isAdminEmail(email)) {
      return res.status(403).json({ error: 'Use the admin sign-in for this account' });
    }
    const key = String(email).toLowerCase();
    const existing = await findGuestByEmail(key);

    if (!existing) {
      const user = await createGuest({ name: email.split('@')[0], email: key, password });
      return res.json({ user, token: `prime_${user.id}` });
    }

    if (existing.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = { id: existing.id, name: existing.name, email: existing.email };
    res.json({ user, token: `prime_${user.id}` });
  })
);

router.get(
  '/me',
  wrap(async (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token.startsWith('prime_')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const id = token.replace('prime_', '');
    const u = await findGuestById(id);
    if (!u) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user: { id: u.id, name: u.name, email: u.email } });
  })
);

module.exports = router;
