const { Low, JSONFile } = require("lowdb");
const path = require("path");
const fs = require("fs");
module.exports = async () => {
  const file = "./.db/attendance.json";

  const adapter = new JSONFile(file);
  const db = new Low(adapter);

  await db.read();
  db.data ||= { attendance: [] };
  return db;
};
