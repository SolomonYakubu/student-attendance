"use-strict";
const dbase = require("../utils/connectCourseDB");

const loadCourse = async (event) => {
  try {
    const db = await dbase();
    const courses = db.data.courses;
    console.log(courses);
    return event.sender.send("loadcourse-res", {
      courses,
      status: "success",
    });
  } catch (error) {
    console.log(error.message);
  }
};
module.exports = { loadCourse };
