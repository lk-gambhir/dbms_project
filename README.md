# Placement Portal
### Full-Stack Database Management System for Student Placement
**Course:** UCS310 - Database Management Systems  
**Institute:** COE, Thapar Institute of Engineering & Technology  
**Academic Year:** 2025-2026  
**Team:** Lakshay Gambhir, Gagan Deep Singh, Divot Singh  
**Lab Instructor:** Yadwinder Singh

---

## Project Structure

```
placement-portal/
├── frontend/
│   ├── index.html       - Single-page application
│   ├── style.css        - Dark theme, responsive UI
│   └── script.js        - Vanilla JS with fetch() API calls
│
├── backend/
│   ├── server.js        - Express entry point
│   ├── .env             - MySQL credentials
│   ├── routes/          - API route handlers
│   ├── controllers/     - Business logic
│   └── models/
│       └── db.js        - MySQL2 connection pool
│
├── database/
    ├── schema.sql       - Full schema + triggers + procedures + seed data
```

---

## Tech Stack

| Layer     | Technology           |
|-----------|----------------------|
| Frontend  | HTML5, CSS3, Vanilla JS |
| Backend   | Node.js + Express    |
| Database  | MySQL 8.0            |
| Driver    | mysql2 (promises)    |
| Dev Tool  | nodemon              |

---

## Database Design

### Tables (3NF Normalized)

| Table                 | Primary Key          | Description                        |
|-----------------------|----------------------|------------------------------------|
| ADDRESS               | address_id           | Normalized address data            |
| STUDENT               | student_id           | Student academic info              |
| SKILL                 | skill_id             | Available skills                   |
| STUDENT_SKILL         | (student_id, skill_id) | Student-Skill junction (M:N)     |
| COMPANY               | company_id           | Recruiting companies               |
| JOB_ROLE              | job_id               | Roles offered by companies         |
| JOB_SKILL_REQUIREMENT | (job_id, skill_id)   | Job-Skill junction (M:N)          |
| APPLICATION           | application_id       | Student job applications           |
| PLACEMENT_RESULT      | result_id            | Final placement outcomes           |

### PL/SQL Features

| Feature              | Name                          | Description                                        |
|----------------------|-------------------------------|----------------------------------------------------|
| Trigger              | before_application_insert     | Validates CGPA eligibility and job active status   |
| Trigger              | before_student_delete         | Prevents deletion of placed students               |
| Stored Procedure     | sp_apply_for_job              | Application with transaction + concurrency control |
| Stored Procedure     | sp_process_applications       | Bulk select/reject using cursor                    |
| Stored Procedure     | sp_record_placement           | Placement recording with double-placement check    |
| Stored Procedure     | sp_get_dashboard_stats        | Dashboard statistics in single call                |
| Stored Procedure     | sp_transfer_student           | Branch transfer with SAVEPOINT                     |
| Stored Procedure     | GetPlacementSummary           | Placed students report                             |
| Function             | fn_is_placed                  | Returns student placement status                   |
| Function             | fn_eligible_job_count         | Counts eligible jobs for a student                 |
| Function             | fn_branch_placement_pct       | Branch placement percentage                        |
| View                 | eligible_applicants           | Students eligible per job role                     |
| View                 | vw_application_details        | Application details with joins                     |
| View                 | vw_student_profile            | Student profile with placement info                |

### Key Constraints
- CGPA: 0.00 - 10.00 (CHECK constraint)
- Email: UNIQUE across all students
- Application: UNIQUE (student_id, job_id)
- Foreign keys enforced with ON DELETE CASCADE

---

## REST API Reference

**Base URL:** `http://localhost:5001/api`

### Students `/api/students`

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/students`           | Get all students         |
| GET    | `/students?search=X`  | Search by name/branch    |
| GET    | `/students?sortBy=cgpa` | Sort by CGPA descending |
| GET    | `/students/:id`       | Get student by ID        |
| POST   | `/students`           | Add new student          |
| PUT    | `/students/:id`       | Update student           |
| DELETE | `/students/:id`       | Delete student           |
| PUT    | `/students/:id/transfer` | Transfer branch (SP)  |

### Skills `/api/skills`

| Method | Endpoint                        | Description               |
|--------|---------------------------------|---------------------------|
| GET    | `/skills`                       | Get all skills            |
| POST   | `/skills`                       | Add new skill             |
| POST   | `/skills/assign`                | Assign skill to student   |
| DELETE | `/skills/:student_id/:skill_id` | Remove skill from student |
| GET    | `/skills/student/:student_id`   | Get student's skills      |

### Companies & Jobs `/api/companies`

| Method | Endpoint                     | Description             |
|--------|------------------------------|-------------------------|
| GET    | `/companies`                 | Get all companies       |
| POST   | `/companies`                 | Add company             |
| GET    | `/companies/jobs`            | Get all job roles       |
| GET    | `/companies/:id/jobs`        | Get jobs by company     |
| POST   | `/companies/jobs`            | Add job role            |
| DELETE | `/companies/jobs/:id`        | Delete job role         |

### Applications `/api/applications`

| Method | Endpoint                    | Description                             |
|--------|-----------------------------|-----------------------------------------|
| GET    | `/applications`             | Get all applications                    |
| POST   | `/applications`             | Apply for job (calls sp_apply_for_job)  |
| PUT    | `/applications/:id/status`  | Update status with row-level locking    |
| POST   | `/applications/process`     | Bulk process (calls sp_process_applications) |
| GET    | `/applications/student/:id` | Get applications by student             |

### Placements `/api/placements`

| Method | Endpoint               | Description                              |
|--------|------------------------|------------------------------------------|
| GET    | `/placements`          | Get all placement results                |
| POST   | `/placements`          | Record placement (calls sp_record_placement) |
| GET    | `/placements/stats`    | Dashboard statistics (calls sp_get_dashboard_stats) |
| GET    | `/placements/branch`   | Branch-wise placement summary            |
| GET    | `/placements/summary`  | Placement summary (calls GetPlacementSummary) |

---

## Frontend Pages

| Page         | Features                                              |
|--------------|-------------------------------------------------------|
| Dashboard    | Stats cards, branch-wise placement bar chart          |
| Students     | Add/Delete/Search/Sort by CGPA                        |
| Skills       | Add skills, assign/remove skills per student          |
| Companies    | Add and list recruiting companies                     |
| Job Roles    | Add roles with package and CGPA filter                |
| Apply        | Live eligibility check before submission              |
| Applications | Track status, bulk process with cursor-based SP       |
| Results      | Record and view final placement outcomes              |

---

## Normalization

The schema is normalized to **3NF**:
- **1NF:** No repeating groups; all attributes atomic
- **2NF:** No partial dependencies on composite keys
- **3NF:** No transitive dependencies; address data separated into ADDRESS table

---

*Placement Portal - UCS310 DBMS Project, TIET 2025-26*
