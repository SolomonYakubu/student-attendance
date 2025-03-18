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

  const dbPath = path.resolve("./.db/courses.db");
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

  // Create courses table
  await run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Return a clean DB interface
  return {
    read: async () => {
      const courses = await all("SELECT * FROM courses");
      return { courses: courses.map((course) => course.code) };
    },

    getCourse: async (id) => {
      try {
        const course = await get("SELECT * FROM courses WHERE id = ?", [id]);
        return course || null;
      } catch (error) {
        console.error("Error fetching course:", error);
        return null;
      }
    },

    getCourseByCode: async (code) => {
      try {
        const course = await get("SELECT * FROM courses WHERE code = ?", [
          code,
        ]);
        return course || null;
      } catch (error) {
        console.error("Error fetching course by code:", error);
        return null;
      }
    },

    createCourse: async (code) => {
      try {
        const result = await run("INSERT INTO courses (code) VALUES (?)", [
          code,
        ]);
        return result.lastID;
      } catch (error) {
        console.error("Error creating course:", error);
        return null;
      }
    },

    createManyCourses: async (codes) => {
      try {
        const stmt = await db.prepare(
          "INSERT OR IGNORE INTO courses (code) VALUES (?)"
        );
        for (const code of codes) {
          await new Promise((resolve, reject) => {
            stmt.run([code], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        await new Promise((resolve, reject) => {
          stmt.finalize((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        return { success: true };
      } catch (error) {
        console.error("Error creating multiple courses:", error);
        return { success: false };
      }
    },

    updateCourse: async (id, newCode) => {
      try {
        const result = await run("UPDATE courses SET code = ? WHERE id = ?", [
          newCode,
          id,
        ]);
        return result.changes > 0;
      } catch (error) {
        console.error("Error updating course:", error);
        return false;
      }
    },

    deleteCourse: async (code) => {
      try {
        const result = await run("DELETE FROM courses WHERE code = ?", [code]);
        return result.changes > 0;
      } catch (error) {
        console.error("Error deleting course:", error);
        return false;
      }
    },

    close: () => {
      return db.close();
    },
  };
};
