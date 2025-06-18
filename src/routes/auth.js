const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const multer = require('multer');
const auth = require('../middleware/auth');

// Use local storage for resumes
const path = require('path');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/resumes');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, companyName, about } = req.body;

    // Check if user already exists
    const userCheck = await db.query('SELECT * FROM public.users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userResult = await db.query(
      'INSERT INTO public.users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, role]
    );
    const userId = userResult.rows[0].id;

    // Create profile based on role
    if (role === 'student') {
      await db.query(
        'INSERT INTO students (user_id, first_name, last_name) VALUES ($1, $2, $3)',
        [userId, firstName, lastName]
      );
    } else if (role === 'company') {
      await db.query(
        'INSERT INTO companies (user_id, company_name, about) VALUES ($1, $2, $3)',
        [userId, companyName, about]
      );
    }

    // Create token with user data
    const tokenPayload = { id: userId, email, role };
    const responseUser = { id: userId, email, role };

    // Add role-specific data to token and response
    if (role === 'student') {
      tokenPayload.first_name = firstName;
      tokenPayload.last_name = lastName;
      responseUser.first_name = firstName;
      responseUser.last_name = lastName;
    } else if (role === 'company') {
      tokenPayload.company_name = companyName;
      responseUser.company_name = companyName;
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: responseUser
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const userResult = await db.query('SELECT * FROM public.users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Fetch additional user data based on role
    let additionalUserData = {};
    if (user.role === 'student') {
      const studentResult = await db.query('SELECT first_name, last_name FROM students WHERE user_id = $1', [user.id]);
      if (studentResult.rows.length > 0) {
        additionalUserData = {
          first_name: studentResult.rows[0].first_name,
          last_name: studentResult.rows[0].last_name
        };
      }
    } else if (user.role === 'company') {
      const companyResult = await db.query('SELECT company_name FROM companies WHERE user_id = $1', [user.id]);
      if (companyResult.rows.length > 0) {
        additionalUserData = {
          company_name: companyResult.rows[0].company_name
        };
      }
    }

    // Create token with additional user data
    const tokenPayload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      ...additionalUserData
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        ...additionalUserData
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Student uploads resume
router.post('/upload-resume', auth, upload.single('resume'), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can upload resumes.' });
    }
    // Store web-accessible URL instead of file path
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    await db.query(
      'UPDATE students SET resume_url = $1, resume_filename = $2, updated_at = NOW() WHERE user_id = $3',
      [resumeUrl, req.file.originalname, req.user.id]
    );
    res.json({ url: resumeUrl, filename: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// Company fetches a student's resume
router.get('/student/:userId/resume', auth, async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can download resumes.' });
    }
    const { userId } = req.params;
    const result = await db.query('SELECT resume_url, resume_filename FROM students WHERE user_id = $1', [userId]);
    if (result.rows.length === 0 || !result.rows[0].resume_url) {
      return res.status(404).json({ message: 'Resume not found.' });
    }
    res.json({ url: result.rows[0].resume_url, filename: result.rows[0].resume_filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resume', details: err.message });
  }
});

// Download resume file directly
router.get('/download/resume/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({ message: 'Only companies can download resumes.' });
    }
    
    const { userId } = req.params;
    const result = await db.query('SELECT resume_url, resume_filename FROM students WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0 || !result.rows[0].resume_url) {
      return res.status(404).json({ message: 'Resume not found.' });
    }
    
    const fs = require('fs');
    
    // Convert URL path to actual file path
    const resumeUrl = result.rows[0].resume_url;
    const filename = resumeUrl.replace('/uploads/resumes/', '');
    const filePath = path.join(__dirname, '../uploads/resumes', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Resume file not found on server.' });
    }
    
    // Set proper headers for download
    const originalFilename = result.rows[0].resume_filename || filename;
    res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (err) {
    console.error('Resume download error:', err);
    res.status(500).json({ error: 'Failed to download resume', details: err.message });
  }
});

module.exports = router;
