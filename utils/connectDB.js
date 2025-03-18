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

  const dbPath = path.resolve("./.db/database.db");
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

  // Create users table with all required fields
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      matric TEXT UNIQUE,
      department TEXT,
      courses TEXT, /* Stored as JSON string */
      scanned BOOLEAN,
      dp TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Return a clean DB interface
  return {
    read: async () => {
      const users = await all("SELECT * FROM users");
      return {
        users: users.map((row) => ({
          ...row,
          courses: JSON.parse(row.courses || "[]"),
          scanned: Boolean(row.scanned),
        })),
      };
    },

    updateUser: async (id, userData) => {
      // Prepare update fields and values
      const fields = [];
      const values = [];

      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(
            key === "courses"
              ? JSON.stringify(value)
              : key === "scanned"
              ? value
                ? 1
                : 0
              : value
          );
        }
      });

      if (fields.length === 0) return false; // No fields to update

      values.push(id);
      const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
      const result = await run(query, values);

      return result.changes > 0;
    },

    getUser: async (id) => {
      try {
        const user = await get("SELECT * FROM users WHERE id = ?", [id]);
        if (!user) return null;

        return {
          ...user,
          courses: JSON.parse(user.courses || "[]"),
          scanned: Boolean(user.scanned),
        };
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },

    deleteUser: async (id) => {
      try {
        const result = await run("DELETE FROM users WHERE id = ?", [id]);
        return result.changes > 0;
      } catch (error) {
        console.error("Error deleting user:", error);
        return false;
      }
    },

    createUser: async (userData) => {
      try {
        const coursesJSON = JSON.stringify(userData.courses || []);
        const result = await run(
          `INSERT INTO users (id, name, matric, department, courses, scanned, dp) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userData.id || Math.random().toString(36).substring(2, 15),
            userData.name,
            userData.matric,
            userData.department,
            coursesJSON,
            userData.scanned ? 1 : 0,
            userData.dp,
          ]
        );
        return result.lastID;
      } catch (error) {
        console.error("Error creating user:", error);
        return null;
      }
    },

    close: () => {
      return db.close();
    },
  };
};
