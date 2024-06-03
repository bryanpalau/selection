-- Table for storing student information
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name TEXT NOT NULL
);

-- Table for storing courses that students have already taken
CREATE TABLE taken_courses (
    student_id INTEGER,
    course_id INTEGER,
    course_name TEXT NOT NULL,
    elective_type TEXT NOT NULL,
    PRIMARY KEY (student_id, course_id, elective_type),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Table for storing grades
CREATE TABLE grades (
    student_id INTEGER,
    course_id INTEGER,
    course_name TEXT NOT NULL,
    elective_type TEXT NOT NULL,
    grade INTEGER,
    PRIMARY KEY (student_id, course_id, elective_type),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Table for storing courses for elective set 1
CREATE TABLE elective_1 (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    required_grade INTEGER
);

-- Table for storing courses for elective set 2
CREATE TABLE elective_2 (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    required_grade INTEGER
);

-- Table for storing courses that students have selected
CREATE TABLE selected_courses (
    student_id INTEGER,
    course_id INTEGER,
    course_name TEXT NOT NULL,
    elective_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, elective_type),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Insert additional dummy data into students table
INSERT INTO students (student_id, student_name) VALUES
(000, 'Test'),
(703, 'Alice Johnson'),
(704, 'Bob Brown'),
(705, 'Charlie Davis'),
(706, 'Kenny Lu'),
(707, 'Ben Al'),
(708, 'Cate Smith'),
(709, 'Tom Lin'),
(710, 'Justin Lee');

-- Insert additional dummy data into taken_courses table
INSERT INTO taken_courses (student_id, course_id, course_name, elective_type) VALUES
(703, 101, 'Introduction to Art', 'elective_1'),
(703, 202, 'Physics', 'elective_2'),
(704, 102, 'History of Art', 'elective_1'),
(704, 201, 'Advanced Mathematics', 'elective_2'),
(705, 101, 'Introduction to Art', 'elective_1'),
(703, 106, 'Dance', 'elective_1'),
(705, 202, 'Physics', 'elective_2');

-- Insert additional dummy data into grades table
INSERT INTO grades (student_id, course_id, course_name, elective_type, grade) VALUES
(703, 101, 'Introduction to Art', 'elective_1', 78),
(703, 202, 'Physics', 'elective_2', 92),
(704, 102, 'History of Art', 'elective_1', 85),
(704, 201, 'Advanced Mathematics', 'elective_2', 88),
(705, 101, 'Introduction to Art', 'elective_1', 80),
(705, 202, 'Physics', 'elective_2', 91),
(703, 103, 'Creative Writing', 'elective_1', 78),
(703, 106, 'Dance', 'elective_1', 100),
(703, 104, 'Music Theory', 'elective_1', 98);

-- Insert additional dummy data into elective_1 table with electives that do not have requirements
INSERT INTO elective_1 (course_id, course_name, required_grade) VALUES
(103, 'Creative Writing', 90),
(104, 'Music Theory', 80),
(105, 'Fine Arts', NULL),
(106, 'Dance', NULL);

-- Insert additional dummy data into elective_2 table with electives that do not have requirements
INSERT INTO elective_2 (course_id, course_name, required_grade) VALUES
(203, 'Introduction to Programming', NULL),
(204, 'Environmental Science', NULL);

-- Insert additional dummy data into selected_courses table
INSERT INTO selected_courses (student_id, course_id, course_name, elective_type) VALUES
(000, 103, 'Creative Writing', 'elective_1');
