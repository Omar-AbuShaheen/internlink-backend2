const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Middleware to check admin role
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admins only' });
  }
}

// Get all users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const result = await db.query('SELECT id, email, role FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all companies
router.get('/companies', auth, adminOnly, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM companies');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all students
router.get('/students', auth, adminOnly, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM students');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all internships
router.get('/internships', auth, adminOnly, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM internships');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a user by ID
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a company by ID
router.delete('/companies/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM companies WHERE id = $1', [id]);
    res.json({ message: 'Company deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete an internship by ID
router.delete('/internships/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM internships WHERE id = $1', [id]);
    res.json({ message: 'Internship deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve an internship
router.patch('/internships/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE internships SET status = 'approved' WHERE id = $1", [id]);
    res.json({ message: 'Internship approved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reject an internship
router.patch('/internships/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE internships SET status = 'rejected' WHERE id = $1", [id]);
    res.json({ message: 'Internship rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Change user role
router.patch('/users/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    res.json({ message: 'User role updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 