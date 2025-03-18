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

  const dbPath = path.resolve("./.db/attendance.db");
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

  // Create attendance table
  await run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      attendance TEXT, /* Stored as JSON string of attendance records */
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Return a clean DB interface
  return {
    read: async () => {
      const records = await all("SELECT * FROM attendance");
      return {
        attendance: records.map((record) => ({
          ...record,
          attendance: JSON.parse(record.attendance || "[]"),
        })),
      };
    },

    updateAttendance: async (id, attendanceData) => {
      // Prepare update fields and values
      const fields = [];
      const values = [];

      Object.entries(attendanceData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(key === "attendance" ? JSON.stringify(value) : value);
        }
      });

      if (fields.length === 0) return false; // No fields to update

      values.push(id);
      const query = `UPDATE attendance SET ${fields.join(", ")} WHERE id = ?`;
      const result = await run(query, values);

      return result.changes > 0;
    },

    getAttendance: async (id) => {
      try {
        const record = await get("SELECT * FROM attendance WHERE id = ?", [id]);
        if (!record) return null;

        return {
          ...record,
          attendance: JSON.parse(record.attendance || "[]"),
        };
      } catch (error) {
        console.error("Error fetching attendance:", error);
        return null;
      }
    },

    deleteAttendance: async (id) => {
      try {
        const result = await run("DELETE FROM attendance WHERE id = ?", [id]);
        return result.changes > 0;
      } catch (error) {
        console.error("Error deleting attendance:", error);
        return false;
      }
    },

    createAttendance: async (attendanceData) => {
      try {
        const attendanceJSON = JSON.stringify(attendanceData.attendance || []);
        const result = await run(
          `INSERT INTO attendance (id, student_id, attendance) 
           VALUES (?, ?, ?)`,
          [
            attendanceData.id || Math.random().toString(36).substring(2, 15),
            attendanceData.student_id,
            attendanceJSON,
          ]
        );
        return result.lastID;
      } catch (error) {
        console.error("Error creating attendance record:", error);
        return null;
      }
    },

    getStudentAttendance: async (studentId) => {
      try {
        const record = await get(
          "SELECT * FROM attendance WHERE student_id = ?",
          [studentId]
        );
        if (!record) return null;

        return {
          ...record,
          attendance: JSON.parse(record.attendance || "[]"),
        };
      } catch (error) {
        console.error("Error fetching student attendance:", error);
        return null;
      }
    },

    close: () => {
      return db.close();
    },
  };
};
