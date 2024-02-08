"use-strict";
const dbase = require("../utils/connectCourseDB");
const lodash = require("lodash");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const addCourse = async (event, arg) => {
  try {
    const file = "./.db";
    if (!fs.existsSync(file)) {
      fs.mkdirSync(file);
    }
    const db = await dbase();
    const course = arg
      .replace(/\s/g, "")
      .split(/([a-zA-Z]+)/)
      .join(" ")
      .toUpperCase()
      .trim();
    if (course.length !== 7 || !/\d{3}/.test(course)) {
      return event.sender.send("course-res", {
        error: true,

        status: "Invalid Course Code",
      });
    }
    db.chain = lodash.chain(db.data);
    if (db.chain.get("courses").includes(course).value()) {
      return event.sender.send("course-res", {
        error: true,

        status: "Course already Registered",
      });
    }

    // Create and query items using plain JS

    db.data.courses.push(course);
    await db.write();
    // const user = db.chain.get("users").remove({ matric: "ddd" }).value();
    // await db.write();
    // console.log(user);
    return (
      db.chain.get("courses").includes(course).value() &&
      event.sender.send("course-res", {
        error: false,

        status: "success",
      })
    );
  } catch (error) {
    console.log(error.message);
  }
};
module.exports = {
  addCourse,
};
