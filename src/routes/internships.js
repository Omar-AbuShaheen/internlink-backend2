const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Get all approved internships (public)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT internships.*, companies.company_name
      FROM internships
      JOIN companies ON internships.company_id = companies.id
      WHERE internships.status = 'approved'
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Middleware to extract user from JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // user.id, user.role, etc.
    next();
  });
}

// Post a new internship (company only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can post internships.' });
    }

    // Get the company_id for this user
    const companyResult = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
    if (companyResult.rows.length === 0) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const company_id = companyResult.rows[0].id;

    // Now use company_id in your insert
    const { title, description, requirements, location, type, duration, is_remote, deadline } = req.body;

    // Log incoming request body for debugging
    console.log("POST /internships body:", req.body);

    // Check for missing required fields (e.g. title, company_id, etc.)
    if (!title || !company_id) {
      return res.status(400).json({ message: "Missing required fields (e.g. title, company_id)." });
    }

    const result = await db.query(
      `INSERT INTO internships (company_id, title, description, requirements, location, type, duration, is_remote, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [company_id, title, description, requirements, location, type, duration, is_remote, deadline]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Log the error (and req.body) for debugging
    console.error("Error in POST /internships:", err, "req.body:", req.body);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all internships for the logged-in company
router.get('/company/internships', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can access their internships.' });
    }
    // Get the company_id for this user
    const companyResult = await db.query('SELECT id, company_name FROM companies WHERE user_id = $1', [userId]);
    if (companyResult.rows.length === 0) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const company_id = companyResult.rows[0].id;
    const company_name = companyResult.rows[0].company_name;
    
    // Get all internships for this company with application counts
    const result = await db.query(
      `SELECT 
        i.*,
        $1 AS company_name,
        CAST(COUNT(a.id) AS INTEGER) as application_count,
        CAST(COUNT(CASE WHEN a.created_at > NOW() - INTERVAL '7 days' THEN 1 END) AS INTEGER) as recent_applications
      FROM internships i
      LEFT JOIN applications a ON i.id = a.internship_id
      WHERE i.company_id = $2
      GROUP BY i.id
      ORDER BY i.posted_at DESC`,
      [company_name, company_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error in GET /company/internships:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get internship by id (with company name)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT internships.*, companies.company_name
      FROM internships
      JOIN companies ON internships.company_id = companies.id
      WHERE internships.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Internship not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all applicants for a given internship (company only)
router.get('/:id/applicants', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const internshipId = req.params.id;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can view applicants.' });
    }
    // Check that this internship belongs to the logged-in company
    const companyResult = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
    if (companyResult.rows.length === 0) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const company_id = companyResult.rows[0].id;
    const internshipResult = await db.query('SELECT * FROM internships WHERE id = $1 AND company_id = $2', [internshipId, company_id]);
    if (internshipResult.rows.length === 0) {
      return res.status(403).json({ message: 'You do not have access to this internship.' });
    }
    // Get all applicants for this internship
    const applicantsResult = await db.query(`
      SELECT applications.*, students.first_name, students.last_name, users.email, students.university, students.major, students.resume_url, students.resume_filename, students.user_id
      FROM applications
      JOIN students ON applications.student_id = students.id
      JOIN users ON students.user_id = users.id
      WHERE applications.internship_id = $1
      ORDER BY applications.created_at DESC
    `, [internshipId]);
    res.json(applicantsResult.rows);
  } catch (err) {
    console.error('Error in GET /:id/applicants:', err, 'params:', req.params, 'user:', req.user);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Edit internship (company only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const internshipId = req.params.id;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can edit internships.' });
    }
    // Check that this internship belongs to the logged-in company
    const companyResult = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
    if (companyResult.rows.length === 0) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const company_id = companyResult.rows[0].id;
    const internshipResult = await db.query('SELECT * FROM internships WHERE id = $1 AND company_id = $2', [internshipId, company_id]);
    if (internshipResult.rows.length === 0) {
      return res.status(403).json({ message: 'You do not have access to this internship.' });
    }
    // Update the internship
    const { title, description, requirements, location, type, duration, is_remote, deadline } = req.body;
    const result = await db.query(
      `UPDATE internships SET title = $1, description = $2, requirements = $3, location = $4, type = $5, duration = $6, is_remote = $7, deadline = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [title, description, requirements, location, type, duration, is_remote, deadline, internshipId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete internship (company only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const internshipId = req.params.id;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can delete internships.' });
    }
    // Check that this internship belongs to the logged-in company
    const companyResult = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
    if (companyResult.rows.length === 0) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const company_id = companyResult.rows[0].id;
    const internshipResult = await db.query('SELECT * FROM internships WHERE id = $1 AND company_id = $2', [internshipId, company_id]);
    if (internshipResult.rows.length === 0) {
      return res.status(403).json({ message: 'You do not have access to this internship.' });
    }
    await db.query('DELETE FROM internships WHERE id = $1', [internshipId]);
    res.json({ message: 'Internship deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update application status (company only)
router.patch('/applications/:id', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const applicationId = req.params.id;
    const { status } = req.body;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can update application status.' });
    }
    // Find the application and check ownership
    const appResult = await db.query('SELECT internship_id FROM applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found.' });
    }
    const internshipId = appResult.rows[0].internship_id;
    // Check that this internship belongs to the logged-in company
    const companyResult = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
    if (companyResult.rows.length === 0) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const company_id = companyResult.rows[0].id;
    const internshipResult = await db.query('SELECT * FROM internships WHERE id = $1 AND company_id = $2', [internshipId, company_id]);
    if (internshipResult.rows.length === 0) {
      return res.status(403).json({ message: 'You do not have access to this internship.' });
    }
    // Update the application status
    const result = await db.query('UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, applicationId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all applications for the logged-in student
router.get('/student/applications', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'student') {
      return res.status(403).json({ message: 'Only students can access their applications.' });
    }
    // Get the student_id for this user
    const studentResult = await db.query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      return res.status(400).json({ message: 'Student profile not found.' });
    }
    const student_id = studentResult.rows[0].id;
    // Get all applications for this student, including internship and company info
    const result = await db.query(`
      SELECT applications.*, internships.title, internships.location, internships.deadline, internships.type, companies.company_name
      FROM applications
      JOIN internships ON applications.internship_id = internships.id
      JOIN companies ON internships.company_id = companies.id
      WHERE applications.student_id = $1
      ORDER BY applications.created_at DESC
    `, [student_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get student profile
router.get('/student/profile', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'student') {
      return res.status(403).json({ message: 'Only students can access their profile.' });
    }
    const result = await db.query('SELECT * FROM students WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update student profile
router.put('/student/profile', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'student') {
      return res.status(403).json({ message: 'Only students can update their profile.' });
    }
    const fields = [
      'first_name', 'last_name', 'phone', 'university', 'major', 'graduation_year', 'resume_url', 'profile_picture_url', 'bio'
    ];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(req.body[field]);
        idx++;
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update.' });
    }
    // Get student id
    const studentResult = await db.query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }
    const student_id = studentResult.rows[0].id;
    values.push(student_id);
    const result = await db.query(
      `UPDATE students SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Student applies to an internship
router.post('/:id/apply', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const internshipId = req.params.id;
    if (role !== 'student') {
      return res.status(403).json({ message: 'Only students can apply to internships.' });
    }
    // Get the student_id for this user
    const studentResult = await db.query('SELECT id FROM students WHERE user_id = $1', [userId]);
    if (studentResult.rows.length === 0) {
      return res.status(400).json({ message: 'Student profile not found.' });
    }
    const student_id = studentResult.rows[0].id;
    // Check if already applied
    const existing = await db.query('SELECT * FROM applications WHERE internship_id = $1 AND student_id = $2', [internshipId, student_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'You have already applied to this internship.' });
    }
    // Insert application
    const { cover_letter } = req.body;
    const result = await db.query(
      'INSERT INTO applications (internship_id, student_id, cover_letter) VALUES ($1, $2, $3) RETURNING *',
      [internshipId, student_id, cover_letter || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update internship status (company only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const internshipId = req.params.id;
    const { status } = req.body;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can update internship status.' });
    }
    // Check that this internship belongs to the logged-in company
    const companyResult = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
    if (companyResult.rows.length === 0) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const company_id = companyResult.rows[0].id;
    const internshipResult = await db.query('SELECT * FROM internships WHERE id = $1 AND company_id = $2', [internshipId, company_id]);
    if (internshipResult.rows.length === 0) {
      return res.status(403).json({ message: 'You do not have access to this internship.' });
    }
    // Update the status
    const result = await db.query(
      'UPDATE internships SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, internshipId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in PUT /:id/status:', err, 'params:', req.params, 'body:', req.body, 'user:', req.user);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Multer setup for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/resumes'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `resume_${req.user.id}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Resume upload endpoint for students
router.post('/student/upload-resume', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'student') {
      return res.status(403).json({ message: 'Only students can upload resumes.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    // Update student's resume_url
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    await db.query('UPDATE students SET resume_url = $1, updated_at = NOW() WHERE user_id = $2', [resumeUrl, userId]);
    res.json({ resume_url: resumeUrl });
  } catch (err) {
    console.error('Error in POST /student/upload-resume:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get company profile
router.get('/company/profile', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can access their profile.' });
    }
    const result = await db.query('SELECT * FROM companies WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company profile not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update company profile
router.put('/company/profile', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'company') {
      return res.status(403).json({ message: 'Only companies can update their profile.' });
    }
    const fields = [
      'company_name', 'industry', 'website', 'location', 'company_size', 'company_logo_url', 'about'
    ];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(req.body[field]);
        idx++;
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update.' });
    }
    // Get company id
    const companyResult = await db.query('SELECT id FROM companies WHERE user_id = $1', [userId]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Company profile not found.' });
    }
    const company_id = companyResult.rows[0].id;
    values.push(company_id);
    const result = await db.query(
      `UPDATE companies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 