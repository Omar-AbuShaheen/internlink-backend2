# InternLink - Backend API

A robust Node.js backend API for the InternLink platform, providing secure endpoints for internship management, user authentication, and application processing.

## 🚀 Technologies Used

- **Node.js** - JavaScript runtime environment
- **Express.js** (v4.21.2) - Web application framework
- **PostgreSQL** (v8.16.0) - Relational database
- **JSON Web Token** (v9.0.2) - Authentication mechanism
- **Bcrypt** (v6.0.0) - Password hashing
- **Multer** (v2.0.0) - File upload handling
- **Helmet** (v8.1.0) - Security middleware
- **Morgan** (v1.10.0) - HTTP request logger
- **CORS** (v2.8.5) - Cross-Origin Resource Sharing
- **Dotenv** (v16.5.0) - Environment variable management

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🛠️ Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd internlink/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/internlink
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```

4. Set up the database:
   ```sql
   CREATE DATABASE internlink;
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Internships
- `GET /api/internships` - Get all approved internships
- `POST /api/internships` - Create new internship (Company only)
- `GET /api/internships/:id` - Get internship by ID
- `PUT /api/internships/:id` - Update internship (Company only)
- `DELETE /api/internships/:id` - Delete internship (Company only)
- `GET /api/internships/company/internships` - Get company's internships
- `GET /api/internships/:id/applicants` - Get internship applicants

### Students
- `GET /api/students/profile` - Get student profile
- `PUT /api/students/profile` - Update student profile
- `POST /api/students/apply/:internshipId` - Apply for internship
- `GET /api/students/applications` - Get student's applications

### Companies
- `GET /api/companies/profile` - Get company profile
- `PUT /api/companies/profile` - Update company profile
- `GET /api/companies/dashboard` - Get company dashboard stats

### Admin
- `GET /api/admin/internships` - Get all internships
- `PUT /api/admin/internships/:id/status` - Update internship status
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/status` - Update user status

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

## 📁 File Upload

Resume uploads are handled using Multer:
- Supported formats: PDF, DOC, DOCX
- Maximum file size: 5MB
- Files are stored in: `/uploads/resumes`

## 🔧 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'company', 'admin')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Students Table
```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  university VARCHAR(255),
  major VARCHAR(255),
  graduation_year INTEGER,
  gpa DECIMAL(3,2),
  skills TEXT[],
  bio TEXT,
  resume_url TEXT,
  resume_filename VARCHAR(255),
  linkedin_url VARCHAR(255),
  github_url VARCHAR(255),
  portfolio_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Companies Table
```sql
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(255),
  company_size VARCHAR(50),
  founded_year INTEGER,
  website_url VARCHAR(255),
  logo_url TEXT,
  description TEXT,
  location VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  linkedin_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Internships Table
```sql
CREATE TABLE internships (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  responsibilities TEXT,
  benefits TEXT,
  location VARCHAR(255),
  type VARCHAR(50) CHECK (type IN ('full-time', 'part-time', 'flexible')),
  duration VARCHAR(50),
  is_paid BOOLEAN DEFAULT false,
  is_remote BOOLEAN DEFAULT false,
  salary_range VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'closed')),
  deadline DATE,
  positions_available INTEGER DEFAULT 1,
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Applications Table
```sql
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  internship_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'accepted')),
  cover_letter TEXT,
  resume_url TEXT,
  resume_filename VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(internship_id, student_id)
);
```

### Skills Table
```sql
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Student_Skills Table (Junction Table)
```sql
CREATE TABLE student_skills (
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, skill_id)
);
```

### Internship_Skills Table (Junction Table)
```sql
CREATE TABLE internship_skills (
  internship_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (internship_id, skill_id)
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) CHECK (type IN ('application_update', 'profile_update', 'system_message')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  internship_id INTEGER REFERENCES internships(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, internship_id)
);
```

### Important Database Relationships:

1. One-to-One:
   - User -> Student/Company (through user_id)

2. One-to-Many:
   - Company -> Internships
   - Internship -> Applications
   - User -> Notifications

3. Many-to-Many:
   - Students <-> Skills (through student_skills)
   - Internships <-> Skills (through internship_skills)

### Indexes for Performance:
```sql
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Applications table indexes
CREATE INDEX idx_applications_internship ON applications(internship_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Internships table indexes
CREATE INDEX idx_internships_company ON internships(company_id);
CREATE INDEX idx_internships_status ON internships(status);
CREATE INDEX idx_internships_deadline ON internships(deadline);

-- Skills table indexes
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);

-- Notifications table indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
```

## 🧪 Error Handling

The API uses a consistent error response format:

```json
{
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## 🔍 Logging

Morgan is configured for HTTP request logging:
- Development: `dev` format
- Production: `combined` format

## 🛡️ Security Features

1. Password Hashing (bcrypt)
2. JWT Authentication
3. Helmet Security Headers
4. CORS Configuration
5. Rate Limiting
6. Input Validation
7. SQL Injection Protection

## 🚀 Deployment

1. Set production environment variables
2. Build the application:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start
   ```

## 📈 Performance Considerations

- Connection pooling for database
- Proper indexing on frequently queried fields
- Caching strategies for common requests
- Rate limiting for API endpoints
- Pagination for large data sets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, please email [support@internlink.com](mailto:support@internlink.com)

---

Made with ❤️ by Omar Abu Shaheen 