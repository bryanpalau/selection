const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const db = new sqlite3.Database(path.resolve(__dirname, 'schema.db'));

app.use(cors());
app.use(bodyParser.json());

// Serve the index.html file
app.use(express.static(path.join(__dirname, 'public')));

// Fetch courses for a specific elective type
app.get('/api/courses', (req, res) => {
  const studentId = req.query.studentId;
  const electiveType = req.query.electiveType;
  const electiveTable = electiveType === 'elective_1' ? 'elective_1' : 'elective_2';

  db.all(
    `SELECT course_id, course_name, required_grade 
     FROM ${electiveTable}`,
    (err, courses) => {
      if (err) {
        console.error('Error fetching courses:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      db.all(
        `SELECT course_id FROM taken_courses WHERE student_id = ?`,
        [studentId],
        (err, takenCourses) => {
          if (err) {
            console.error('Error fetching taken courses:', err.message);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          const takenCourseIds = takenCourses.map(tc => tc.course_id);

          db.all(
            `SELECT course_id, grade FROM grades WHERE student_id = ?`,
            [studentId],
            (err, grades) => {
              if (err) {
                console.error('Error fetching grades:', err.message);
                return res.status(500).json({ error: 'Internal Server Error' });
              }

              const courseGrades = grades.reduce((acc, grade) => {
                acc[grade.course_id] = grade.grade;
                return acc;
              }, {});

              db.all(
                `SELECT course_id, COUNT(*) as count FROM selected_courses WHERE elective_type = ? GROUP BY course_id`,
                [electiveType],
                (err, courseCounts) => {
                  if (err) {
                    console.error('Error fetching course counts:', err.message);
                    return res.status(500).json({ error: 'Internal Server Error' });
                  }

                  const courseCountMap = courseCounts.reduce((acc, count) => {
                    acc[count.course_id] = count.count;
                    return acc;
                  }, {});

                  courses.forEach(course => {
                    const studentGrade = courseGrades[course.course_id];
                    const selectedCount = courseCountMap[course.course_id] || 0;
                    if (
                      takenCourseIds.includes(course.course_id) ||
                      (course.required_grade && (!studentGrade || studentGrade < course.required_grade)) ||
                      selectedCount >= 16
                    ) {
                      course.disabled = true;
                    } else {
                      course.disabled = false;
                    }

                    console.log(`Course ID: ${course.course_id}, Course Name: ${course.course_name}, Required Grade: ${course.required_grade}, Student Grade: ${studentGrade}, Selected Count: ${selectedCount}, Disabled: ${course.disabled}`);
                  });

                  console.log(`Courses for elective type ${electiveType}:`, courses);
                  res.json(courses);
                }
              );
            }
          );
        }
      );
    }
  );
});

// Fetch grade for a specific course
app.get('/api/grade', (req, res) => {
  const studentId = req.query.studentId;
  const courseId = req.query.courseId;
  db.get(
    `SELECT grade FROM grades WHERE student_id = ? AND course_id = ?`,
    [studentId, courseId],
    (err, row) => {
      if (err) {
        console.error('Error fetching grade:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json({ grade: row ? row.grade : null });
    }
  );
});

// Check if student ID exists
app.get('/api/students/:id', (req, res) => {
  const studentId = req.params.id;
  db.get(
    `SELECT student_id FROM students WHERE student_id = ?`,
    [studentId],
    (err, row) => {
      if (err) {
        console.error('Error fetching student ID:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      console.log('Student ID check result:', row);
      res.json({ exists: !!row });
    }
  );
});

// Select a course
app.post('/api/select-course', (req, res) => {
  const { studentId, courseId, electiveType } = req.body;

  // Check if the student has already selected a course in this elective set
  db.get(`SELECT * FROM selected_courses WHERE student_id = ? AND elective_type = ?`, [studentId, electiveType], (err, row) => {
    if (err) {
      console.error('Error checking selected course:', err.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (row) {
      return res.status(400).json({ error: 'Student has already selected a course from this elective set' });
    }

    // Check if the course is already taken
    db.get(`SELECT * FROM taken_courses WHERE student_id = ? AND course_id = ?`, [studentId, courseId], (err, row) => {
      if (err) {
        console.error('Error checking taken course:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      if (row) {
        return res.status(400).json({ error: 'Course already taken' });
      }

      // Determine which elective table to query for the required grade
      const electiveTable = electiveType === 'elective_1' ? 'elective_1' : 'elective_2';

      // Fetch the required grade for the course from the appropriate elective table
      db.get(`SELECT required_grade FROM ${electiveTable} WHERE course_id = ?`, [courseId], (err, courseRow) => {
        if (err) {
          console.error('Error fetching course:', err.message);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        const requiredGrade = courseRow.required_grade;
        if (requiredGrade === null) {
          // If no grade requirement, proceed to select the course
          insertSelectedCourse(studentId, courseId, electiveType, electiveTable, res);
        } else {
          // Check if the student meets the prerequisite grade
          db.get(`SELECT grade FROM grades WHERE student_id = ? AND course_id = ?`, [studentId, courseId], (err, gradeRow) => {
            if (err) {
              console.error('Error checking grade:', err.message);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            const studentGrade = gradeRow ? gradeRow.grade : null;

            if (studentGrade === null || studentGrade < requiredGrade) {
              return res.status(400).json({ error: `You have not met the grade requirement of ${requiredGrade}. Your grade is ${studentGrade !== null ? studentGrade : 'N/A'}.` });
            }

            // Proceed to select the course if not already selected, not already taken, and meets the prerequisite grade
            insertSelectedCourse(studentId, courseId, electiveType, electiveTable, res);
          });
        }
      });
    });
  });
});

// Function to insert selected course into the database
function insertSelectedCourse(studentId, courseId, electiveType, electiveTable, res) {
  // Adjust the time zone here
  const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
  db.run(
    `INSERT INTO selected_courses (student_id, course_id, course_name, elective_type, timestamp) VALUES (?, ?, (SELECT course_name FROM ${electiveTable} WHERE course_id = ?), ?, ?)`,
    [studentId, courseId, courseId, electiveType, timestamp],
    (err) => {
      if (err) {
        console.error('Error inserting course into selected_courses:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json({ message: 'Success' });
    }
  );
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
