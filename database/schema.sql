
DROP DATABASE IF EXISTS placement_portal;
CREATE DATABASE placement_portal;
USE placement_portal;

CREATE TABLE IF NOT EXISTS ADDRESS (
    address_id   INT AUTO_INCREMENT PRIMARY KEY,
    city         VARCHAR(100) NOT NULL,
    state        VARCHAR(100) NOT NULL,
    country      VARCHAR(100) NOT NULL DEFAULT 'India',
    UNIQUE KEY unique_address (city, state, country)
);

CREATE TABLE IF NOT EXISTS STUDENT (
    student_id   INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,
    phone        VARCHAR(15)  DEFAULT NULL,
    branch       VARCHAR(50)  NOT NULL,
    cgpa         DECIMAL(4,2) NOT NULL CHECK (cgpa >= 0 AND cgpa <= 10),
    year         INT          NOT NULL CHECK (year BETWEEN 1 AND 5),
    address_id   INT          DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (address_id) REFERENCES ADDRESS(address_id) ON DELETE SET NULL,
    INDEX idx_student_branch (branch),
    INDEX idx_student_cgpa (cgpa)
);

CREATE TABLE IF NOT EXISTS SKILL (
    skill_id    INT AUTO_INCREMENT PRIMARY KEY,
    skill_name  VARCHAR(100) NOT NULL UNIQUE,
    category    VARCHAR(50)  DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS STUDENT_SKILL (
    student_id       INT NOT NULL,
    skill_id         INT NOT NULL,
    proficiency      ENUM('Beginner','Intermediate','Advanced','Expert') DEFAULT 'Intermediate',
    PRIMARY KEY (student_id, skill_id),
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id)   REFERENCES SKILL(skill_id)     ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS COMPANY (
    company_id    INT AUTO_INCREMENT PRIMARY KEY,
    company_name  VARCHAR(150) NOT NULL,
    location      VARCHAR(100) NOT NULL,
    website       VARCHAR(255) DEFAULT NULL,
    INDEX idx_company_name (company_name)
);

CREATE TABLE IF NOT EXISTS JOB_ROLE (
    job_id       INT AUTO_INCREMENT PRIMARY KEY,
    company_id   INT            NOT NULL,
    role         VARCHAR(100)   NOT NULL,
    min_cgpa     DECIMAL(4,2)   NOT NULL CHECK (min_cgpa >= 0 AND min_cgpa <= 10),
    package      DECIMAL(10,2)  NOT NULL COMMENT 'Package in LPA',
    openings     INT            NOT NULL DEFAULT 1,
    deadline     DATE           DEFAULT NULL,
    is_active    BOOLEAN        DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES COMPANY(company_id) ON DELETE CASCADE,
    INDEX idx_job_package (package),
    INDEX idx_job_active (is_active)
);

CREATE TABLE IF NOT EXISTS JOB_SKILL_REQUIREMENT (
    job_id    INT NOT NULL,
    skill_id  INT NOT NULL,
    PRIMARY KEY (job_id, skill_id),
    FOREIGN KEY (job_id)   REFERENCES JOB_ROLE(job_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES SKILL(skill_id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS APPLICATION (
    application_id  INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    job_id          INT NOT NULL,
    status          ENUM('Pending', 'Selected', 'Rejected') DEFAULT 'Pending',
    applied_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_application (student_id, job_id),
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id)     REFERENCES JOB_ROLE(job_id)   ON DELETE CASCADE,
    INDEX idx_app_status (status)
);

CREATE TABLE IF NOT EXISTS PLACEMENT_RESULT (
    result_id     INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    job_id        INT NOT NULL,
    final_status  ENUM('Placed', 'Not Placed') NOT NULL,
    recorded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_placement (student_id, job_id),
    FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id)     REFERENCES JOB_ROLE(job_id)    ON DELETE CASCADE
);

DELIMITER $$
CREATE TRIGGER before_application_insert
BEFORE INSERT ON APPLICATION
FOR EACH ROW
BEGIN
    DECLARE student_cgpa DECIMAL(4,2);
    DECLARE min_required DECIMAL(4,2);
    DECLARE job_active BOOLEAN;

    SELECT cgpa INTO student_cgpa FROM STUDENT WHERE student_id = NEW.student_id;
    SELECT min_cgpa, is_active INTO min_required, job_active FROM JOB_ROLE WHERE job_id = NEW.job_id;

    IF job_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This job role is no longer accepting applications.';
    END IF;

    IF student_cgpa < min_required THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'CGPA does not meet minimum eligibility requirement for this job.';
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER before_student_delete
BEFORE DELETE ON STUDENT
FOR EACH ROW
BEGIN
    DECLARE placed_count INT;
    SELECT COUNT(*) INTO placed_count
    FROM PLACEMENT_RESULT WHERE student_id = OLD.student_id AND final_status = 'Placed';

    IF placed_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete a student who has been placed. Remove placement record first.';
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE FUNCTION fn_is_placed(p_student_id INT)
RETURNS VARCHAR(20)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE result VARCHAR(20);
    SELECT CASE WHEN COUNT(*) > 0 THEN 'Placed' ELSE 'Not Placed' END
    INTO result
    FROM PLACEMENT_RESULT
    WHERE student_id = p_student_id AND final_status = 'Placed';
    RETURN result;
END$$
DELIMITER ;

DELIMITER $$
CREATE FUNCTION fn_eligible_job_count(p_student_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE job_count INT;
    DECLARE s_cgpa DECIMAL(4,2);
    SELECT cgpa INTO s_cgpa FROM STUDENT WHERE student_id = p_student_id;
    SELECT COUNT(*) INTO job_count FROM JOB_ROLE WHERE min_cgpa <= s_cgpa AND is_active = TRUE;
    RETURN job_count;
END$$
DELIMITER ;

DELIMITER $$
CREATE FUNCTION fn_branch_placement_pct(p_branch VARCHAR(50))
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total INT;
    DECLARE placed INT;
    SELECT COUNT(DISTINCT s.student_id) INTO total FROM STUDENT s WHERE s.branch = p_branch;
    SELECT COUNT(DISTINCT pr.student_id) INTO placed
    FROM PLACEMENT_RESULT pr JOIN STUDENT s ON pr.student_id = s.student_id
    WHERE s.branch = p_branch AND pr.final_status = 'Placed';
    IF total = 0 THEN RETURN 0; END IF;
    RETURN ROUND((placed / total) * 100, 2);
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE GetPlacementSummary()
BEGIN
    SELECT
        s.student_id, s.name, s.branch, s.cgpa,
        c.company_name, j.role, j.package, pr.final_status
    FROM PLACEMENT_RESULT pr
    JOIN STUDENT  s ON pr.student_id = s.student_id
    JOIN JOB_ROLE j ON pr.job_id     = j.job_id
    JOIN COMPANY  c ON j.company_id  = c.company_id
    WHERE pr.final_status = 'Placed'
    ORDER BY j.package DESC;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_apply_for_job(
    IN p_student_id INT,
    IN p_job_id INT,
    OUT p_result VARCHAR(255)
)
BEGIN
    DECLARE s_cgpa DECIMAL(4,2);
    DECLARE j_min_cgpa DECIMAL(4,2);
    DECLARE j_openings INT;
    DECLARE j_active BOOLEAN;
    DECLARE current_apps INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Transaction rolled back due to database error.';
    END;
    DECLARE EXIT HANDLER FOR SQLWARNING
    BEGIN
        ROLLBACK;
        SET p_result = 'WARNING: Transaction rolled back.';
    END;

    START TRANSACTION;

    SELECT cgpa INTO s_cgpa
    FROM STUDENT WHERE student_id = p_student_id FOR UPDATE;

    IF s_cgpa IS NULL THEN
        ROLLBACK;
        SET p_result = 'ERROR: Student not found.';
    ELSE
        SAVEPOINT after_student_check;

        SELECT min_cgpa, openings, is_active INTO j_min_cgpa, j_openings, j_active
        FROM JOB_ROLE WHERE job_id = p_job_id FOR UPDATE;

        IF j_min_cgpa IS NULL THEN
            ROLLBACK TO after_student_check;
            ROLLBACK;
            SET p_result = 'ERROR: Job role not found.';
        ELSEIF j_active = FALSE THEN
            ROLLBACK TO after_student_check;
            ROLLBACK;
            SET p_result = 'ERROR: Job is no longer active.';
        ELSEIF s_cgpa < j_min_cgpa THEN
            ROLLBACK TO after_student_check;
            ROLLBACK;
            SET p_result = CONCAT('ERROR: CGPA ', s_cgpa, ' below minimum ', j_min_cgpa);
        ELSE
            SELECT COUNT(*) INTO current_apps
            FROM APPLICATION WHERE job_id = p_job_id AND status = 'Selected';

            IF current_apps >= j_openings THEN
                ROLLBACK;
                SET p_result = 'ERROR: No openings remaining for this role.';
            ELSE
                INSERT INTO APPLICATION (student_id, job_id, status)
                VALUES (p_student_id, p_job_id, 'Pending');
                COMMIT;
                SET p_result = 'SUCCESS: Application submitted successfully.';
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_process_applications(
    IN p_job_id INT,
    IN p_min_cgpa_cutoff DECIMAL(4,2),
    OUT p_selected INT,
    OUT p_rejected INT
)
BEGIN
    DECLARE v_app_id INT;
    DECLARE v_student_id INT;
    DECLARE v_cgpa DECIMAL(4,2);
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_openings INT;
    DECLARE v_already_selected INT;

    DECLARE app_cursor CURSOR FOR
        SELECT a.application_id, a.student_id, s.cgpa
        FROM APPLICATION a
        JOIN STUDENT s ON a.student_id = s.student_id
        WHERE a.job_id = p_job_id AND a.status = 'Pending'
        ORDER BY s.cgpa DESC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_selected = -1;
        SET p_rejected = -1;
    END;

    SET p_selected = 0;
    SET p_rejected = 0;

    START TRANSACTION;

    SELECT openings INTO v_openings FROM JOB_ROLE WHERE job_id = p_job_id FOR UPDATE;
    SELECT COUNT(*) INTO v_already_selected
    FROM APPLICATION WHERE job_id = p_job_id AND status = 'Selected';

    OPEN app_cursor;
    process_loop: LOOP
        FETCH app_cursor INTO v_app_id, v_student_id, v_cgpa;
        IF v_done = 1 THEN LEAVE process_loop; END IF;

        IF v_cgpa >= p_min_cgpa_cutoff AND (p_selected + v_already_selected) < v_openings THEN
            UPDATE APPLICATION SET status = 'Selected' WHERE application_id = v_app_id;
            SET p_selected = p_selected + 1;
        ELSE
            UPDATE APPLICATION SET status = 'Rejected' WHERE application_id = v_app_id;
            SET p_rejected = p_rejected + 1;
        END IF;
    END LOOP;
    CLOSE app_cursor;

    COMMIT;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_record_placement(
    IN p_student_id INT,
    IN p_job_id INT,
    IN p_status ENUM('Placed', 'Not Placed'),
    OUT p_result VARCHAR(255)
)
BEGIN
    DECLARE already_placed INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Transaction failed.';
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO already_placed
    FROM PLACEMENT_RESULT
    WHERE student_id = p_student_id AND final_status = 'Placed'
    FOR UPDATE;

    IF already_placed > 0 AND p_status = 'Placed' THEN
        ROLLBACK;
        SET p_result = 'ERROR: Student is already placed.';
    ELSE
        INSERT INTO PLACEMENT_RESULT (student_id, job_id, final_status)
        VALUES (p_student_id, p_job_id, p_status)
        ON DUPLICATE KEY UPDATE final_status = p_status;
        COMMIT;
        SET p_result = CONCAT('SUCCESS: Placement recorded as ', p_status);
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_get_dashboard_stats()
BEGIN
    SELECT
        (SELECT COUNT(*) FROM STUDENT) AS total_students,
        (SELECT COUNT(*) FROM COMPANY) AS total_companies,
        (SELECT COUNT(*) FROM JOB_ROLE) AS total_jobs,
        (SELECT COUNT(*) FROM APPLICATION) AS total_applications,
        (SELECT COUNT(DISTINCT student_id) FROM PLACEMENT_RESULT WHERE final_status='Placed') AS placed_students,
        (SELECT ROUND(AVG(cgpa),2) FROM STUDENT) AS avg_cgpa,
        (SELECT MAX(package) FROM JOB_ROLE) AS top_package;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_transfer_student(
    IN p_student_id INT,
    IN p_new_branch VARCHAR(50),
    OUT p_result VARCHAR(255)
)
BEGIN
    DECLARE old_branch VARCHAR(50);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Transfer failed.';
    END;

    START TRANSACTION;

    SELECT branch INTO old_branch FROM STUDENT WHERE student_id = p_student_id FOR UPDATE;

    IF old_branch IS NULL THEN
        ROLLBACK;
        SET p_result = 'ERROR: Student not found.';
    ELSEIF old_branch = p_new_branch THEN
        ROLLBACK;
        SET p_result = 'ERROR: Student is already in this branch.';
    ELSE
        SAVEPOINT before_transfer;
        UPDATE STUDENT SET branch = p_new_branch WHERE student_id = p_student_id;
        COMMIT;
        SET p_result = CONCAT('SUCCESS: Transferred from ', old_branch, ' to ', p_new_branch);
    END IF;
END$$
DELIMITER ;

CREATE OR REPLACE VIEW eligible_applicants AS
SELECT
    s.student_id, s.name, s.cgpa, s.branch,
    j.job_id, j.role, c.company_name,
    fn_is_placed(s.student_id) AS placement_status
FROM STUDENT s
JOIN JOB_ROLE j ON s.cgpa >= j.min_cgpa AND j.is_active = TRUE
JOIN COMPANY  c ON j.company_id = c.company_id;

CREATE OR REPLACE VIEW vw_application_details AS
SELECT
    a.application_id, a.status, a.applied_at, a.updated_at,
    s.student_id, s.name AS student_name, s.email, s.cgpa, s.branch,
    j.job_id, j.role, j.package, j.min_cgpa, j.openings,
    c.company_id, c.company_name, c.location
FROM APPLICATION a
JOIN STUDENT  s ON a.student_id = s.student_id
JOIN JOB_ROLE j ON a.job_id     = j.job_id
JOIN COMPANY  c ON j.company_id = c.company_id;

CREATE OR REPLACE VIEW vw_student_profile AS
SELECT
    s.*,
    fn_is_placed(s.student_id) AS placement_status,
    fn_eligible_job_count(s.student_id) AS eligible_jobs,
    (SELECT COUNT(*) FROM APPLICATION a WHERE a.student_id = s.student_id) AS total_applications
FROM STUDENT s;


INSERT INTO ADDRESS (city, state, country) VALUES
('Patiala', 'Punjab', 'India'),
('Chandigarh', 'Punjab', 'India'),
('Delhi', 'Delhi', 'India'),
('Mumbai', 'Maharashtra', 'India');

INSERT INTO STUDENT (name, email, phone, branch, cgpa, year, address_id) VALUES
('Arjun Sharma',   'arjun@tiet.edu',   '9876543210', 'CSE', 8.9, 4, 1),
('Priya Mehta',    'priya@tiet.edu',   '9876543211', 'ECE', 7.5, 4, 2),
('Rohan Gupta',    'rohan@tiet.edu',   '9876543212', 'ME',  6.8, 3, 3),
('Sneha Kapoor',   'sneha@tiet.edu',   '9876543213', 'CSE', 9.2, 4, 1),
('Vikram Singh',   'vikram@tiet.edu',  '9876543214', 'IT',  7.1, 4, 4),
('Ananya Nair',    'ananya@tiet.edu',  '9876543215', 'CSE', 8.4, 3, 2),
('Karan Bhatia',   'karan@tiet.edu',   '9876543216', 'EE',  6.5, 4, 3),
('Meera Joshi',    'meera@tiet.edu',   '9876543217', 'CSE', 9.5, 4, 1);

INSERT INTO SKILL (skill_name, category) VALUES
('Python', 'Programming'), ('Java', 'Programming'), ('JavaScript', 'Programming'),
('SQL', 'Database'), ('React', 'Frontend'), ('Machine Learning', 'AI/ML'),
('Data Structures', 'CS Fundamentals'), ('C++', 'Programming'),
('Node.js', 'Backend'), ('Cloud Computing', 'DevOps');

INSERT INTO STUDENT_SKILL (student_id, skill_id, proficiency) VALUES
(1,1,'Advanced'),(1,4,'Expert'),(1,7,'Advanced'),
(2,8,'Intermediate'),(2,4,'Intermediate'),
(3,8,'Beginner'),(3,9,'Intermediate'),
(4,1,'Expert'),(4,5,'Advanced'),(4,6,'Advanced'),
(5,3,'Intermediate'),(5,5,'Advanced'),(5,9,'Intermediate'),
(6,1,'Advanced'),(6,6,'Intermediate'),
(7,8,'Intermediate'),(7,4,'Beginner'),
(8,1,'Expert'),(8,5,'Expert'),(8,6,'Advanced');

INSERT INTO COMPANY (company_name, location, website) VALUES
('Google India',  'Hyderabad', 'https://careers.google.com'),
('Microsoft',     'Bengaluru', 'https://careers.microsoft.com'),
('Infosys',       'Pune',      'https://www.infosys.com/careers'),
('TCS',           'Chennai',   'https://www.tcs.com/careers'),
('Amazon',        'Bengaluru', 'https://www.amazon.jobs'),
('Wipro',         'Noida',     'https://careers.wipro.com');

INSERT INTO JOB_ROLE (company_id, role, min_cgpa, package, openings) VALUES
(1, 'Software Engineer',        8.0, 28.00, 3),
(1, 'Data Analyst',             7.5, 22.00, 2),
(2, 'SDE-1',                    7.5, 24.00, 5),
(2, 'Cloud Engineer',           7.0, 20.00, 2),
(3, 'Systems Engineer',         6.0,  8.00, 10),
(4, 'Assistant System Engineer', 5.5, 7.00, 15),
(5, 'SDE-1',                    8.0, 26.00, 4),
(6, 'Project Engineer',         6.0,  6.50, 8);

INSERT INTO JOB_SKILL_REQUIREMENT (job_id, skill_id) VALUES
(1,1),(1,4),(1,7), (2,4),(2,6), (3,2),(3,7), (4,10),(4,9),
(5,2),(5,4), (6,4),(6,8), (7,1),(7,7),(7,3), (8,2),(8,4);
