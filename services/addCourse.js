"use strict";
const path = require("path");
const initDatabase = require("../utils/connectCourseDB");

const addCourse = async (event, arg) => {
  try {
    // Format the course code
    const course = arg
      .replace(/\s/g, "")
      .split(/([a-zA-Z]+)/)
      .join(" ")
      .toUpperCase()
      .trim();

    // Validate course code format
    if (course.length !== 7 || !/\d{3}/.test(course)) {
      return event.sender.send("course-res", {
        error: true,
        status: "Invalid Course Code",
      });
    }

    // Initialize the database
    const db = await initDatabase();

    try {
      // Check if course already exists
      const existingCourse = await db.getCourseByCode(course);

      if (existingCourse) {
        return event.sender.send("course-res", {
          error: true,
          status: "Course already Registered",
        });
      }

      // Add the course to the database
      const courseId = await db.createCourse(course);

      if (!courseId) {
        throw new Error("Failed to create course");
      }

      // Course was added successfully
      return event.sender.send("course-res", {
        error: false,
        status: "success",
      });
    } finally {
      await db.close();
    }
  } catch (error) {
    console.log(error.message);
    event.sender.send("course-res", {
      error: true,
      status: "An error occurred",
    });
  }
};

module.exports = {
  addCourse,
};
