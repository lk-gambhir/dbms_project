-- ============================================================
-- PLACEMENT PORTAL - DATABASE SCHEMA
-- Course: UCS310 - DBMS | TIET, COPC
-- ============================================================

CREATE DATABASE IF NOT EXISTS placement_portal;
USE placement_portal;

-- ============================================================
-- TABLE: STUDENT
-- ============================================================
CREATE TABLE IF NOT EXISTS STUDENT (
    student_id   INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,
    branch       VARCHAR(50)  NOT NULL,
    cgpa         DECIMAL(4,2) NOT NULL CHECK (cgpa >= 0 AND cgpa <= 10),
    year         INT          NOT NULL CHECK (year BETWEEN 1 AND 5),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: SKILL
-- ============================================================
CREATE TABLE IF NOT EXISTS SKILL (
    skill_id    INT AUTO_INCREMENT PRIMARY KEY,
    skill_name  VARCHAR(100) NOT NULL UNIQUE
);

-- ============================================================
-- TABLE: STUDENT_SKILL (Many-to-Many: Student <-> Skill)
-- ============================================================
CREATE TABLE IF NOT EXISTS STUDENT_SKILL (
    student_id  INT NOT NULL,
    skill_id    INT NOT NULL,
    PRIMARY KEY (student_id, skill_id),
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id)   REFERENCES SKILL(skill_id)     ON DELETE CASCADE
);

-- ============================================================
-- TABLE: COMPANY
-- ============================================================
CREATE TABLE IF NOT EXISTS COMPANY (
    company_id    INT AUTO_INCREMENT PRIMARY KEY,
    company_name  VARCHAR(150) NOT NULL,
    location      VARCHAR(100) NOT NULL
);

-- ============================================================
-- TABLE: JOB_ROLE
-- ============================================================
CREATE TABLE IF NOT EXISTS JOB_ROLE (
    job_id      INT AUTO_INCREMENT PRIMARY KEY,
    company_id  INT            NOT NULL,
    role        VARCHAR(100)   NOT NULL,
    min_cgpa    DECIMAL(4,2)   NOT NULL CHECK (min_cgpa >= 0 AND min_cgpa <= 10),
    package     DECIMAL(10,2)  NOT NULL COMMENT 'Package in LPA',
    FOREIGN KEY (company_id) REFERENCES COMPANY(company_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE: APPLICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS APPLICATION (
    application_id  INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    job_id          INT NOT NULL,
    status          ENUM('Pending', 'Selected', 'Rejected') DEFAULT 'Pending',
    applied_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_application (student_id, job_id),  -- Prevent duplicate applications
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id)     REFERENCES JOB_ROLE(job_id)   ON DELETE CASCADE
);

-- ============================================================
-- TABLE: PLACEMENT_RESULT
-- ============================================================
CREATE TABLE IF NOT EXISTS PLACEMENT_RESULT (
    result_id     INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    job_id        INT NOT NULL,
    final_status  ENUM('Placed', 'Not Placed') NOT NULL,
    recorded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id)     REFERENCES JOB_ROLE(job_id)    ON DELETE CASCADE
);

-- ============================================================
-- TRIGGER: Auto-check CGPA eligibility before application insert
-- ============================================================
DELIMITER $$
CREATE TRIGGER before_application_insert
BEFORE INSERT ON APPLICATION
FOR EACH ROW
BEGIN
    DECLARE student_cgpa DECIMAL(4,2);
    DECLARE min_required DECIMAL(4,2);

    SELECT cgpa INTO student_cgpa FROM STUDENT WHERE student_id = NEW.student_id;
    SELECT min_cgpa INTO min_required FROM JOB_ROLE WHERE job_id = NEW.job_id;

    IF student_cgpa < min_required THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'CGPA does not meet minimum eligibility requirement for this job.';
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- STORED PROCEDURE: Get placed students summary
-- ============================================================
DELIMITER $$
CREATE PROCEDURE GetPlacementSummary()
BEGIN
    SELECT
        s.student_id,
        s.name,
        s.branch,
        s.cgpa,
        c.company_name,
        j.role,
        j.package,
        pr.final_status
    FROM PLACEMENT_RESULT pr
    JOIN STUDENT  s ON pr.student_id = s.student_id
    JOIN JOB_ROLE j ON pr.job_id     = j.job_id
    JOIN COMPANY  c ON j.company_id  = c.company_id
    WHERE pr.final_status = 'Placed'
    ORDER BY j.package DESC;
END$$
DELIMITER ;

-- ============================================================
-- VIEW: Eligible students per job (cgpa meets criteria)
-- ============================================================
CREATE OR REPLACE VIEW eligible_applicants AS
SELECT
    s.student_id,
    s.name,
    s.cgpa,
    s.branch,
    j.job_id,
    j.role,
    c.company_name
FROM STUDENT s
JOIN JOB_ROLE j ON s.cgpa >= j.min_cgpa
JOIN COMPANY  c ON j.company_id = c.company_id;

-- ============================================================
-- SAMPLE SEED DATA
-- ============================================================

INSERT INTO STUDENT (name, email, branch, cgpa, year) VALUES
('Arjun Sharma',   'arjun@tiet.edu',   'CSE', 8.9, 4),
('Priya Mehta',    'priya@tiet.edu',   'ECE', 7.5, 4),
('Rohan Gupta',    'rohan@tiet.edu',   'ME',  6.8, 3),
('Sneha Kapoor',   'sneha@tiet.edu',   'CSE', 9.2, 4),
('Vikram Singh',   'vikram@tiet.edu',  'IT',  7.1, 4),
('Ananya Nair',    'ananya@tiet.edu',  'CSE', 8.4, 3),
('Karan Bhatia',   'karan@tiet.edu',   'EE',  6.5, 4),
('Meera Joshi',    'meera@tiet.edu',   'CSE', 9.5, 4);

INSERT INTO SKILL (skill_name) VALUES
('Python'), ('Java'), ('JavaScript'), ('SQL'), ('React'),
('Machine Learning'), ('Data Structures'), ('C++'), ('Node.js'), ('Cloud Computing');

INSERT INTO STUDENT_SKILL VALUES
(1,1),(1,4),(1,7),(2,8),(2,4),(3,8),(3,9),(4,1),(4,5),(4,6),
(5,3),(5,5),(5,9),(6,1),(6,6),(7,8),(7,4),(8,1),(8,5),(8,6);

INSERT INTO COMPANY (company_name, location) VALUES
('Google India',       'Hyderabad'),
('Microsoft',          'Bengaluru'),
('Infosys',            'Pune'),
('TCS',                'Chennai'),
('Amazon',             'Bengaluru'),
('Wipro',              'Noida');

INSERT INTO JOB_ROLE (company_id, role, min_cgpa, package) VALUES
(1, 'Software Engineer',       8.0, 28.00),
(1, 'Data Analyst',            7.5, 22.00),
(2, 'SDE-1',                   7.5, 24.00),
(2, 'Cloud Engineer',          7.0, 20.00),
(3, 'Systems Engineer',        6.0, 8.00),
(4, 'Assistant System Engineer', 5.5, 7.00),
(5, 'SDE-1',                   8.0, 26.00),
(6, 'Project Engineer',        6.0, 6.50);
