const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const internshipsRoutes = require('./routes/internships');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads directory statically
const path = require('path');
const uploadsPath = path.join(__dirname, '../uploads');
console.log('Serving static files from:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/internships', internshipsRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to InternLink API' });
});

// Test route for checking uploads
app.get('/test-uploads', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, '../uploads');
  const resumesPath = path.join(uploadsPath, 'resumes');
  
  try {
    const uploadsExists = fs.existsSync(uploadsPath);
    const resumesExists = fs.existsSync(resumesPath);
    const files = resumesExists ? fs.readdirSync(resumesPath) : [];
    
    res.json({
      uploadsPath,
      resumesPath,
      uploadsExists,
      resumesExists,
      files,
      message: 'Upload directory status'
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 