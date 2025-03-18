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

  const dbPath = path.resolve("./.db/lecturer.db");
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

  // Create lecturers table with all required fields
  await run(`
    CREATE TABLE IF NOT EXISTS lecturers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      staffID TEXT UNIQUE,
      password TEXT,
      department TEXT,
      courses TEXT, /* Stored as JSON string */
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Return a clean DB interface
  return {
    read: async () => {
      const lecturers = await all("SELECT * FROM lecturers");
      return {
        lecturers: lecturers.map((row) => ({
          ...row,
          courses: JSON.parse(row.courses || "[]"),
        })),
      };
    },

    updateLecturer: async (id, lecturerData) => {
      // Prepare update fields and values
      const fields = [];
      const values = [];

      Object.entries(lecturerData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(key === "courses" ? JSON.stringify(value) : value);
        }
      });

      if (fields.length === 0) return false; // No fields to update

      values.push(id);
      const query = `UPDATE lecturers SET ${fields.join(", ")} WHERE id = ?`;
      const result = await run(query, values);

      return result.changes > 0;
    },

    getLecturer: async (id) => {
      try {
        const lecturer = await get("SELECT * FROM lecturers WHERE id = ?", [
          id,
        ]);
        if (!lecturer) return null;

        return {
          ...lecturer,
          courses: JSON.parse(lecturer.courses || "[]"),
        };
      } catch (error) {
        console.error("Error fetching lecturer:", error);
        return null;
      }
    },

    deleteLecturer: async (id) => {
      try {
        const result = await run("DELETE FROM lecturers WHERE id = ?", [id]);
        return result.changes > 0;
      } catch (error) {
        console.error("Error deleting lecturer:", error);
        return false;
      }
    },

    createLecturer: async (lecturerData) => {
      try {
        const { name, staffID, password, courses, department } = lecturerData;
        const coursesJSON = JSON.stringify(courses || []);
        const result = await run(
          `INSERT INTO lecturers (name, staffID, password, courses, department) 
           VALUES (?, ?, ?, ?, ?)`,
          [name, staffID, password, coursesJSON, department]
        );
        return result.lastID;
      } catch (error) {
        console.error("Error creating lecturer:", error);
        return null;
      }
    },

    findByStaffID: async (staffID) => {
      try {
        const lecturer = await get(
          "SELECT * FROM lecturers WHERE staffID = ?",
          [staffID]
        );
        if (!lecturer) return null;

        return {
          ...lecturer,
          courses: JSON.parse(lecturer.courses || "[]"),
        };
      } catch (error) {
        console.error("Error finding lecturer by staffID:", error);
        return null;
      }
    },

    close: () => {
      return db.close();
    },
  };
};
