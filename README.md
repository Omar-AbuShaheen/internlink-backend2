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
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Students Table
```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    university VARCHAR(255),
    major VARCHAR(255),
    graduation_year INT,
    resume_url VARCHAR(255),
    profile_picture_url VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resume_filename VARCHAR(255)
);
```

### Companies Table
```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255),
    industry VARCHAR(100),
    website VARCHAR(255),
    location VARCHAR(255),
    company_size VARCHAR(50),
    company_logo_url VARCHAR(255),
    about TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Internships Table
```sql
CREATE TABLE internships (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    location VARCHAR(255),
    type VARCHAR(50),
    duration VARCHAR(50),
    is_remote BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deadline TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);
```

### Applications Table
```sql
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    internship_id INT NOT NULL,
    student_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    cover_letter TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Important Database Relationships:

1. One-to-One:
   - User -> Student (through user_id)
   - User -> Company (through user_id)

2. One-to-Many:
   - Company -> Internships
   - Internship -> Applications
   - Student -> Applications

### Recommended Indexes:
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