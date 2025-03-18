const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

module.exports = async () => {
  // Ensure the .db directory exists
  const dbDir = path.resolve("./.db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.resolve("./.db/coursesAttendance.db");
  const db = new sqlite3.Database(dbPath);

  // Create promisified versions of database operations
  const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  };

  const all = promisify(db.all.bind(db));
  const get = promisify(db.get.bind(db));

  // Create courses attendance table
  await run(`
    CREATE TABLE IF NOT EXISTS courses_attendance (
      id TEXT PRIMARY KEY,
      course TEXT NOT NULL,
      attendance TEXT, /* Stored as JSON string of attendance records */
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Return a clean DB interface
  return {
    read: async () => {
      const records = await all("SELECT * FROM courses_attendance");
      return {
        courses: records.map((record) => ({
          ...record,
          attendance: JSON.parse(record.attendance || "[]"),
        })),
      };
    },

    updateCourseAttendance: async (id, attendanceData) => {
      const fields = [];
      const values = [];

      Object.entries(attendanceData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(key === "attendance" ? JSON.stringify(value) : value);
        }
      });

      if (fields.length === 0) return false;

      values.push(id);
      const query = `UPDATE courses_attendance SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      const result = await run(query, values);

      return result.changes > 0;
    },

    getCourseAttendance: async (id) => {
      try {
        const record = await get(
          "SELECT * FROM courses_attendance WHERE id = ?",
          [id]
        );
        if (!record) return null;

        return {
          ...record,
          attendance: JSON.parse(record.attendance || "[]"),
        };
      } catch (error) {
        console.error("Error fetching course attendance:", error);
        return null;
      }
    },

    deleteCourseAttendance: async (id) => {
      try {
        const result = await run(
          "DELETE FROM courses_attendance WHERE id = ?",
          [id]
        );
        return result.changes > 0;
      } catch (error) {
        console.error("Error deleting course attendance:", error);
        return false;
      }
    },

    createCourseAttendance: async (courseData) => {
      try {
        const attendanceJSON = JSON.stringify(courseData.attendance || []);
        const result = await run(
          `INSERT INTO courses_attendance (id, course, attendance) 
           VALUES (?, ?, ?)`,
          [
            courseData.id || Math.random().toString(36).substring(2, 15),
            courseData.course,
            attendanceJSON,
          ]
        );
        return result.lastID;
      } catch (error) {
        console.error("Error creating course attendance record:", error);
        return null;
      }
    },

    getCourseAttendanceByName: async (courseName) => {
      try {
        const record = await get(
          "SELECT * FROM courses_attendance WHERE course = ?",
          [courseName]
        );
        if (!record) return null;

        return {
          ...record,
          attendance: JSON.parse(record.attendance || "[]"),
        };
      } catch (error) {
        console.error("Error fetching course attendance:", error);
        return null;
      }
    },

    getAllCourses: async () => {
      try {
        const records = await all(
          "SELECT DISTINCT course FROM courses_attendance"
        );
        return records.map((r) => r.course);
      } catch (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
    },

    close: () => {
      return db.close();
    },
  };
};
