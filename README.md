# 🎓 Placement Portal
### A Full-Stack Database Management System for Student Placement
**Course:** UCS310 – Database Management Systems  
**Institute:** COPC, Thapar Institute of Engineering & Technology  
**Academic Year:** 2025–2026  
**Team:** Lakshay Gambhir · Gagan Deep Singh · Divot Singh  
**Lab Instructor:** Yadwinder Singh  

---

## 📁 Project Structure

```
placement-portal/
├── frontend/
│   ├── index.html       ← Single-page application (all pages)
│   ├── style.css        ← Dark theme, responsive UI
│   └── script.js        ← Vanilla JS, fetch() API calls
│
├── backend/
│   ├── server.js        ← Express entry point
│   ├── .env.example     ← Copy to .env and fill credentials
│   ├── routes/
│   │   ├── studentRoutes.js
│   │   ├── skillRoutes.js
│   │   ├── companyRoutes.js
│   │   ├── applicationRoutes.js
│   │   └── placementRoutes.js
│   ├── controllers/
│   │   ├── studentController.js
│   │   ├── skillController.js
│   │   ├── companyController.js
│   │   ├── applicationController.js
│   │   └── placementController.js
│   └── models/
│       └── db.js        ← MySQL2 connection pool
│
└── database/
    └── schema.sql       ← Full schema + triggers + seed data
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js v18+ → https://nodejs.org
- MySQL 8.0+   → https://mysql.com

### 2. Database Setup
```bash
# Log into MySQL
mysql -u root -p

# Run the schema file (creates DB, tables, triggers, seed data)
source /path/to/placement-portal/database/schema.sql
# OR
mysql -u root -p < database/schema.sql
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env

# Edit .env with your MySQL credentials:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=placement_portal
# PORT=5000

# Start the server
npm start
# OR for development with auto-reload:
npm run dev
```

You should see:
```
✅ MySQL connected successfully
🚀 Placement Portal API running at http://localhost:5000
```

### 4. Frontend Setup
```bash
# Option A — Open directly in browser (simplest)
open frontend/index.html

# Option B — Serve with a local server (recommended)
npx serve frontend
# Then open http://localhost:3000
```

> **Note:** The frontend connects to `http://localhost:5000/api` by default.  
> If you change the backend PORT, update the `API` constant in `frontend/script.js`.

---

## 🔌 REST API Reference

### Base URL: `http://localhost:5000/api`

---

### 👤 Students `/api/students`

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/students`           | Get all students         |
| GET    | `/students?search=X`  | Search by name/branch    |
| GET    | `/students?sortBy=cgpa` | Sort by CGPA descending |
| GET    | `/students/:id`       | Get student by ID        |
| POST   | `/students`           | Add new student          |
| PUT    | `/students/:id`       | Update student           |
| DELETE | `/students/:id`       | Delete student           |

**POST /students — Request Body:**
```json
{
  "name":   "Arjun Sharma",
  "email":  "arjun@tiet.edu",
  "branch": "CSE",
  "cgpa":   8.9,
  "year":   4
}
```

---

### 🔧 Skills `/api/skills`

| Method | Endpoint                        | Description               |
|--------|---------------------------------|---------------------------|
| GET    | `/skills`                       | Get all skills            |
| POST   | `/skills`                       | Add new skill             |
| POST   | `/skills/assign`                | Assign skill to student   |
| DELETE | `/skills/:student_id/:skill_id` | Remove skill from student |
| GET    | `/skills/student/:student_id`   | Get student's skills      |

---

### 🏢 Companies & Jobs `/api/companies`

| Method | Endpoint                     | Description             |
|--------|------------------------------|-------------------------|
| GET    | `/companies`                 | Get all companies       |
| POST   | `/companies`                 | Add company             |
| GET    | `/companies/jobs`            | Get all job roles       |
| GET    | `/companies/:id/jobs`        | Get jobs by company     |
| POST   | `/companies/jobs`            | Add job role            |
| DELETE | `/companies/jobs/:id`        | Delete job role         |

---

### 📋 Applications `/api/applications`

| Method | Endpoint                          | Description                       |
|--------|-----------------------------------|-----------------------------------|
| GET    | `/applications`                   | Get all applications              |
| POST   | `/applications`                   | Apply for job (CGPA check auto)   |
| PUT    | `/applications/:id/status`        | Update status (Pending/Selected/Rejected) |
| GET    | `/applications/student/:id`       | Get applications by student       |

**PUT /applications/:id/status — Body:**
```json
{ "status": "Selected" }
```

---

### 🏆 Placements `/api/placements`

| Method | Endpoint               | Description                   |
|--------|------------------------|-------------------------------|
| GET    | `/placements`          | Get all placement results     |
| POST   | `/placements`          | Add placement result          |
| GET    | `/placements/stats`    | Dashboard statistics          |
| GET    | `/placements/branch`   | Branch-wise placement summary |

---

## 🗄️ Database Design

### Tables
| Table             | Primary Key    | Description                  |
|-------------------|----------------|------------------------------|
| STUDENT           | student_id     | Student academic info        |
| SKILL             | skill_id       | Available skills             |
| STUDENT_SKILL     | (student, skill) | Many-to-many junction      |
| COMPANY           | company_id     | Recruiting companies         |
| JOB_ROLE          | job_id         | Roles offered by companies   |
| APPLICATION       | application_id | Student job applications     |
| PLACEMENT_RESULT  | result_id      | Final placement outcomes     |

### Key Constraints
- CGPA: 0.00 – 10.00 (CHECK constraint)
- Email: UNIQUE across all students
- Application: UNIQUE (student_id, job_id) — no duplicate applications
- All foreign keys enforced with CASCADE

### PL/SQL Features Implemented
- **Trigger:** `before_application_insert` — Auto-validates CGPA eligibility
- **Stored Procedure:** `GetPlacementSummary()` — Placed students report
- **View:** `eligible_applicants` — Students eligible per job role

---

## 🎨 Frontend Pages

| Page         | Features                                              |
|--------------|-------------------------------------------------------|
| Dashboard    | Stats cards, branch-wise placement bar chart          |
| Students     | Add/Delete/Search/Sort by CGPA                        |
| Skills       | Add skills, assign/remove skills per student (chips UI) |
| Companies    | Add and list recruiting companies                     |
| Job Roles    | Add roles with package & CGPA filter                  |
| Apply        | Live eligibility check before submission              |
| Applications | Track status, update Pending/Selected/Rejected        |
| Results      | Record & view final placement outcomes                |

---

## 📐 Normalization

The schema is normalized to **3NF / BCNF**:
- **1NF:** No repeating groups; all attributes atomic
- **2NF:** No partial dependencies on composite keys
- **3NF:** No transitive dependencies (student branch ≠ determinant of other fields)

---

## 🧪 Sample API Test (curl)

```bash
# Health check
curl http://localhost:5000/api/health

# Get all students
curl http://localhost:5000/api/students

# Add a student
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"test@tiet.edu","branch":"CSE","cgpa":8.5,"year":3}'

# Apply for a job
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"student_id":1,"job_id":1}'

# Update application status
curl -X PUT http://localhost:5000/api/applications/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"Selected"}'
```

---

## 🛠️ Tech Stack

| Layer     | Technology           |
|-----------|----------------------|
| Frontend  | HTML5, CSS3, Vanilla JS |
| Backend   | Node.js + Express    |
| Database  | MySQL 8.0            |
| ORM/Driver| mysql2 (promises)    |
| Dev Tool  | nodemon              |

---

*Placement Portal — UCS310 DBMS Project · TIET 2025–26*
