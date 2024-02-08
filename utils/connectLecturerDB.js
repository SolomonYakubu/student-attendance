const { Low, JSONFile } = require("lowdb");

module.exports = async () => {
  const file = "./.db/lecturer.json";

  const adapter = new JSONFile(file);
  const db = new Low(adapter);

  await db.read();
  db.data ||= { lecturers: [] };
  return db;
};
