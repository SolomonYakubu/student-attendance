"use-strict";
const dbase = require("../utils/connectCourseDB");

const loadCourse = async (event) => {
  const db = await dbase();
  try {
    // Using the new read() method to fetch courses
    const coursesData = await db.read();
    const courses = coursesData.courses;
    console.log(courses);
    return event.sender.send("loadcourse-res", {
      courses,
      status: "success",
    });
  } catch (error) {
    console.log(error.message);
    return event.sender.send("loadcourse-res", {
      courses: [],
      status: "error",
      message: error.message,
    });
  } finally {
    await db.close();
  }
};

module.exports = { loadCourse };
