const { Low, JSONFile } = require("lowdb");
module.exports = async () => {
  const file = "./.db/courses.json";

  const adapter = new JSONFile(file);
  const db = new Low(adapter);

  await db.read();
  db.data ||= { courses: [] };
  return db;
};
